"""Ensemble probability combiner and simple calibration helpers."""

from __future__ import annotations

from dataclasses import dataclass
from math import exp, log
from statistics import fmean


def _clip_probability(value: float) -> float:
    return min(max(value, 1e-6), 1.0 - 1e-6)


def platt_scale(raw_probability: float, a: float = 1.0, b: float = 0.0) -> float:
    """Simple parametric probability calibration."""

    raw_probability = _clip_probability(raw_probability)
    log_odds = log(raw_probability / (1.0 - raw_probability))
    return 1.0 / (1.0 + exp(-(a * log_odds + b)))


@dataclass(frozen=True)
class EnsembleResult:
    probability: float
    confidence: float
    component_probabilities: dict[str, float]
    weights: dict[str, float]


def combine_probabilities(
    component_probabilities: dict[str, float],
    weights: dict[str, float] | None = None,
) -> EnsembleResult:
    """
    Weighted ensemble with confidence based on agreement and edge size.
    """

    component_weights = weights or {
        "bayesian": 0.45,
        "regime": 0.25,
        "ml_proxy": 0.30,
    }
    normalized_total = sum(component_weights.values())
    normalized_weights = {
        name: weight / normalized_total
        for name, weight in component_weights.items()
    }
    probability = sum(
        component_probabilities[name] * normalized_weights[name]
        for name in component_probabilities
    )
    average_component = fmean(component_probabilities.values())
    disagreement = fmean(
        abs(probability - component_value)
        for component_value in component_probabilities.values()
    )
    confidence = max(0.0, min(1.0, (abs(probability - 0.5) * 1.5) + (0.4 - disagreement)))
    return EnsembleResult(
        probability=platt_scale(probability),
        confidence=confidence,
        component_probabilities=component_probabilities,
        weights=normalized_weights,
    )


def random_forest_proxy(features: dict[str, float]) -> float:
    """
    Small deterministic nonlinear proxy for an ML classifier.

    This is intentionally transparent rather than pretending to be a trained model.
    """

    score = (
        0.55
        + 0.35 * (features.get("rolling_sentiment", 0.5) - 0.5)
        - 0.40 * features.get("shock_intensity", 0.0)
        + 0.20 * features.get("momentum", 0.0)
        - 0.25 * max(features.get("oil_stress", 0.0), 0.0)
        + 0.10 * features.get("order_flow_imbalance", 0.0)
    )
    return max(0.0, min(1.0, score))
