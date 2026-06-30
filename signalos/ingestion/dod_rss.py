from __future__ import annotations

import re

from bs4 import BeautifulSoup
import feedparser
import httpx
import pandas as pd

from signalos.ingestion.common import normalize_ts, write_raw_frame


async def fetch_dod_rss() -> pd.DataFrame:
    rows: list[dict] = []
    for url, source in [
        ("https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=20", "dod"),
        ("https://news.usni.org/category/fleet-tracker/feed", "usni"),
    ]:
        parsed = feedparser.parse(url)
        for entry in parsed.entries:
            text = f"{entry.get('title', '')} {entry.get('summary', '')}"
            rows.append(
                {
                    "source": source,
                    "published": normalize_ts(entry.get("published")),
                    "title": entry.get("title"),
                    "link": entry.get("link"),
                    "text": text,
                    "csg_mentions": len(re.findall(r"CVN-\d+|Carrier Strike Group", text)),
                }
            )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("dod_rss", frame)
    return frame


async def fetch_centcom_press() -> pd.DataFrame:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://www.centcom.mil/MEDIA/PRESS-RELEASES/")
        response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")
    rows = []
    for link in soup.select("a[href]")[:50]:
        title = link.get_text(" ", strip=True)
        if not title:
            continue
        rows.append(
            {
                "published": pd.Timestamp.utcnow(),
                "title": title,
                "link": link["href"],
                "text": title,
                "source": "centcom",
                "csg_mentions": int("carrier" in title.lower()),
            }
        )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("centcom", frame)
    return frame
