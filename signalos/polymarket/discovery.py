from __future__ import annotations

from signalos.ingestion.polymarket import PolymarketClient


async def discover_markets() -> list[dict]:
    return await PolymarketClient().discover_iran_markets()
