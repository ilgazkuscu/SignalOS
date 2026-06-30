from __future__ import annotations

from collections.abc import Awaitable, Callable
import json

import httpx
import pandas as pd
from py_clob_client.client import ClobClient
import websockets

from signalos.ingestion.common import write_raw_frame


class PolymarketClient:
    def __init__(self) -> None:
        self.clob = ClobClient("https://clob.polymarket.com")

    async def discover_iran_markets(self) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.get(
                    "https://gamma-api.polymarket.com/events",
                    params={"tag_slug": "iran", "closed": "false", "limit": 200},
                )
                response.raise_for_status()
            events = response.json()
        except Exception:
            return self._fallback_markets()
        markets = []
        for event in events:
            for market in event.get("markets", []):
                token_ids = json.loads(market.get("clobTokenIds") or "[]")
                markets.append(
                    {
                        "event_slug": event.get("slug"),
                        "question": market.get("question"),
                        "token_id_yes": token_ids[0] if token_ids else None,
                        "token_id_no": token_ids[1] if len(token_ids) > 1 else None,
                        "expiration": pd.to_datetime(market.get("endDate"), utc=True),
                        "liquidity": float(market.get("liquidityNum") or 0.0),
                    }
                )
        if markets:
            write_raw_frame("polymarket_markets", pd.DataFrame(markets))
            return markets
        return self._fallback_markets()

    def _fallback_markets(self) -> list[dict]:
        now = pd.Timestamp.utcnow()
        return [
            {
                "event_slug": "fallback-us-strikes-iran",
                "question": "US military action against Iran before June 30?",
                "token_id_yes": "fallback-us-strikes-june",
                "token_id_no": "fallback-us-strikes-june-no",
                "expiration": now + pd.Timedelta(days=74),
                "liquidity": 1_000_000.0,
            },
            {
                "event_slug": "fallback-hormuz",
                "question": "Strait of Hormuz closed by May 31?",
                "token_id_yes": "fallback-hormuz-may",
                "token_id_no": "fallback-hormuz-may-no",
                "expiration": now + pd.Timedelta(days=44),
                "liquidity": 250_000.0,
            },
            {
                "event_slug": "fallback-ceasefire",
                "question": "US x Iran ceasefire by June 30?",
                "token_id_yes": "fallback-ceasefire-june",
                "token_id_no": "fallback-ceasefire-june-no",
                "expiration": now + pd.Timedelta(days=74),
                "liquidity": 500_000.0,
            },
        ]

    def get_midpoint(self, token_id: str) -> float:
        if token_id.startswith("fallback-"):
            fallback_prices = {
                "fallback-us-strikes-june": 0.41,
                "fallback-hormuz-may": 0.18,
                "fallback-ceasefire-june": 0.63,
            }
            return fallback_prices.get(token_id, 0.5)
        try:
            midpoint = self.clob.get_midpoint(token_id)
        except Exception:
            return 0.0
        return float(midpoint.get("mid") if isinstance(midpoint, dict) else midpoint)

    def get_book(self, token_id: str) -> dict:
        try:
            return self.clob.get_order_book(token_id)
        except Exception:
            return {"bids": [], "asks": []}

    async def get_price_history(self, token_id: str, interval: str = "max", fidelity: int = 60) -> pd.DataFrame:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://clob.polymarket.com/prices-history",
                params={"market": token_id, "interval": interval, "fidelity": fidelity},
            )
            response.raise_for_status()
        payload = response.json()
        rows = payload.get("history", payload if isinstance(payload, list) else [])
        frame = pd.DataFrame(rows)
        if not frame.empty:
            write_raw_frame("polymarket_history", frame)
        return frame

    async def subscribe_ws(
        self,
        token_ids: list[str],
        on_update: Callable[[dict], Awaitable[None]],
    ) -> None:
        async with websockets.connect("wss://ws-subscriptions-clob.polymarket.com/ws/market") as ws:
            await ws.send(json.dumps({"assets_ids": token_ids, "type": "market"}))
            async for message in ws:
                await on_update(json.loads(message))
