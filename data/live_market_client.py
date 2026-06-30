"""Live Polymarket client for the Python quant runner."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.request import Request, urlopen

from data.live_source_registry import POLYMARKET_MARKET_SLUGS


@dataclass(frozen=True)
class LiveMarketSnapshot:
    market_id: str
    slug: str
    yes_price: float
    volume: float
    liquidity: float
    fetched_at: str


def _clamp_probability(value: float) -> float:
    return max(0.0, min(1.0, value))


def parse_polymarket_payload(bucket: str, slug: str, payload: dict[str, object]) -> LiveMarketSnapshot:
    outcomes = payload.get("outcomes", [])
    outcome_prices = payload.get("outcomePrices", [])

    if isinstance(outcomes, str):
        outcomes = json.loads(outcomes)
    if isinstance(outcome_prices, str):
        outcome_prices = json.loads(outcome_prices)

    yes_price = None
    if isinstance(outcomes, list) and isinstance(outcome_prices, list):
        for index, outcome in enumerate(outcomes):
            if str(outcome).lower() == "yes" and index < len(outcome_prices):
                yes_price = float(outcome_prices[index])
                break

    if yes_price is None:
        yes_price = float(payload.get("lastTradePrice", 0.5) or 0.5)

    return LiveMarketSnapshot(
        market_id=bucket,
        slug=str(payload.get("slug", slug)),
        yes_price=_clamp_probability(yes_price),
        volume=float(payload.get("volume", 0.0) or 0.0),
        liquidity=float(payload.get("liquidity", 0.0) or 0.0),
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )


def fetch_live_polymarket_snapshots(timeout_seconds: float = 8.0) -> list[LiveMarketSnapshot]:
    snapshots: list[LiveMarketSnapshot] = []
    for bucket, slug in POLYMARKET_MARKET_SLUGS.items():
        request = Request(
            url=f"https://gamma-api.polymarket.com/markets/slug/{slug}",
            headers={
                "User-Agent": "ProjectZero/1.0 quant-runner",
                "Accept": "application/json",
            },
        )
        with urlopen(request, timeout=timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
        snapshots.append(parse_polymarket_payload(bucket, slug, payload))
    return snapshots
