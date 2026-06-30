"""Transparency helpers for daily model-vs-market tracking across deadline buckets."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from models.deadline_hazard_model import DeadlineHazardModel


BUCKET_DEADLINES = {
    "apr-15": "2026-04-15T23:59:59+00:00",
    "apr-21": "2026-04-21T23:59:59+00:00",
    "apr-30": "2026-04-30T23:59:59+00:00",
    "may-31": "2026-05-31T23:59:59+00:00",
    "jun-30": "2026-06-30T23:59:59+00:00",
}


@dataclass(frozen=True)
class BucketPrediction:
    market_id: str
    deadline: str
    days_to_deadline: int
    market_probability: float
    model_probability: float
    edge: float


def _days_to_deadline(now: datetime, deadline_iso: str) -> int:
    deadline = datetime.fromisoformat(deadline_iso.replace("Z", "+00:00"))
    delta = deadline - now
    return max(1, int(delta.total_seconds() // 86400))


def build_bucket_prediction_curve(
    *,
    now: datetime,
    bucket_market_prices: dict[str, float],
    base_probability: float,
    hazard_model: DeadlineHazardModel,
    hazard_features: dict[str, float],
) -> list[BucketPrediction]:
    curve: list[BucketPrediction] = []
    for market_id, deadline_iso in BUCKET_DEADLINES.items():
        days_to_deadline = _days_to_deadline(now, deadline_iso)
        model_probability = hazard_model.probability_by_deadline(
            base_probability=base_probability,
            horizon_days=days_to_deadline,
            features=hazard_features,
        )
        market_probability = bucket_market_prices.get(market_id, bucket_market_prices.get("apr-21", base_probability))
        curve.append(
            BucketPrediction(
                market_id=market_id,
                deadline=deadline_iso,
                days_to_deadline=days_to_deadline,
                market_probability=market_probability,
                model_probability=model_probability,
                edge=model_probability - market_probability,
            )
        )
    return curve
