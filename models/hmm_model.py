"""Lightweight hidden-regime filter for geopolitical market states."""

from __future__ import annotations

from dataclasses import dataclass
from math import exp


REGIMES = ("calm", "escalation", "de_escalation")


def _normalize(weights: dict[str, float]) -> dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        uniform = 1.0 / len(weights)
        return {key: uniform for key in weights}
    return {key: value / total for key, value in weights.items()}


@dataclass(frozen=True)
class HMMResult:
    regime_probabilities: dict[str, float]
    regime_score: float


TRANSITION_MATRIX = {
    "calm": {"calm": 0.78, "escalation": 0.12, "de_escalation": 0.10},
    "escalation": {"calm": 0.18, "escalation": 0.68, "de_escalation": 0.14},
    "de_escalation": {"calm": 0.23, "escalation": 0.11, "de_escalation": 0.66},
}


def _emission_score(regime: str, features: dict[str, float]) -> float:
    shock = features.get("shock_intensity", 0.0)
    momentum = features.get("momentum", 0.0)
    oil_stress = features.get("oil_stress", 0.0)
    sentiment = features.get("rolling_sentiment", 0.5) - 0.5

    if regime == "escalation":
        return 1.6 * shock + 1.2 * max(momentum, 0.0) + 1.0 * max(oil_stress, 0.0) - 0.6 * sentiment
    if regime == "de_escalation":
        return 1.1 * max(sentiment, 0.0) - 0.8 * shock - 0.7 * max(oil_stress, 0.0)
    return 0.2 - 0.4 * shock - 0.2 * abs(momentum)


def infer_regimes(
    features: dict[str, float],
    prior: dict[str, float] | None = None,
    transition_matrix: dict[str, dict[str, float]] | None = None,
) -> HMMResult:
    """
    One-step hidden regime update.

    This is a filtering step with fixed transitions, not full Baum-Welch training.
    """

    previous = prior or {"calm": 0.5, "escalation": 0.25, "de_escalation": 0.25}
    transitions = transition_matrix or TRANSITION_MATRIX
    predicted = {
        target: sum(previous[source] * transitions[source][target] for source in REGIMES)
        for target in REGIMES
    }
    emission_weights = {
        regime: exp(_emission_score(regime, features))
        for regime in REGIMES
    }
    posterior = _normalize({
        regime: predicted[regime] * emission_weights[regime]
        for regime in REGIMES
    })
    regime_score = posterior["de_escalation"] - posterior["escalation"]
    return HMMResult(regime_probabilities=posterior, regime_score=regime_score)
