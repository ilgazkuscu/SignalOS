from __future__ import annotations

import asyncio
import json

import feedparser
import httpx
import pandas as pd
import websockets

from signalos.config import get_settings
from signalos.ingestion.common import normalize_ts, write_raw_frame


class NitterRSS:
    bases = ["https://xcancel.com", "https://nitter.privacydev.net"]

    async def fetch_user(self, user: str) -> pd.DataFrame:
        for base in self.bases:
            parsed = feedparser.parse(f"{base}/{user}/rss")
            if getattr(parsed, "bozo", False):
                continue
            rows = [
                {
                    "user": user,
                    "published": normalize_ts(entry.get("published")),
                    "text": entry.get("title"),
                    "link": entry.get("link"),
                }
                for entry in parsed.entries
            ]
            frame = pd.DataFrame(rows)
            if not frame.empty:
                write_raw_frame("osint_social", frame)
            return frame
        return pd.DataFrame(columns=["user", "published", "text", "link"])


class BlueskyFirehose:
    def __init__(self) -> None:
        self.url = "wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos"

    async def sample(self, seconds: int = 3) -> pd.DataFrame:
        rows = []
        async with websockets.connect(self.url) as ws:
            end = asyncio.get_running_loop().time() + seconds
            while asyncio.get_running_loop().time() < end:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=1)
                except TimeoutError:
                    continue
                rows.append({"published": pd.Timestamp.utcnow(), "payload": str(message)[:500]})
        return pd.DataFrame(rows)


class XAPIClient:
    def __init__(self) -> None:
        self.bearer = get_settings().x_api_bearer

    async def fetch_user_tweets(self, user: str) -> pd.DataFrame:
        if not self.bearer:
            return pd.DataFrame(columns=["user"])
        async with httpx.AsyncClient(timeout=20) as client:
            lookup = await client.get(
                f"https://api.x.com/2/users/by/username/{user}",
                headers={"Authorization": f"Bearer {self.bearer}"},
            )
            lookup.raise_for_status()
            user_id = lookup.json()["data"]["id"]
            tweets = await client.get(
                f"https://api.x.com/2/users/{user_id}/tweets",
                headers={"Authorization": f"Bearer {self.bearer}"},
            )
            tweets.raise_for_status()
        rows = [
            {
                "user": user,
                "published": normalize_ts(item.get("created_at")),
                "text": item.get("text"),
                "id": item.get("id"),
            }
            for item in tweets.json().get("data", [])
        ]
        frame = pd.DataFrame(rows)
        if not frame.empty:
            write_raw_frame("x_api", frame)
        return frame
