"""Market feature engineering for prediction markets."""

from __future__ import annotations

from math import sqrt
from statistics import fmean
from typing import Iterable


def extract_market_features(series: Iterable[dict[str, float]]) -> dict[str, float]:
    """
    Derive basic momentum and volatility features from market snapshots.

    Expected fields:
    - probability
    - yes_volume (optional)
    - no_volume (optional)
    """

    points = list(series)
    if len(points) < 2:
        return {
            "market_prob": points[0]["probability"] if points else 0.5,
            "momentum": 0.0,
            "volatility": 0.0,
            "order_flow_imbalance": 0.0,
        }

    probabilities = [point["probability"] for point in points]
    deltas = [
        probabilities[index] - probabilities[index - 1]
        for index in range(1, len(probabilities))
    ]
    mean_delta = fmean(deltas)
    variance = fmean([(delta - mean_delta) ** 2 for delta in deltas]) if deltas else 0.0
    latest = points[-1]
    yes_volume = latest.get("yes_volume", 0.0)
    no_volume = latest.get("no_volume", 0.0)
    total_volume = yes_volume + no_volume

    return {
        "market_prob": max(0.0, min(1.0, probabilities[-1])),
        "momentum": mean_delta,
        "volatility": sqrt(max(variance, 0.0)),
        "order_flow_imbalance": ((yes_volume - no_volume) / total_volume) if total_volume else 0.0,
    }
