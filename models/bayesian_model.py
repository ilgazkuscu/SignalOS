"""Bayesian log-odds updating over a market prior."""

from __future__ import annotations

from dataclasses import dataclass
from math import exp, log


def _clip_probability(value: float) -> float:
    return min(max(value, 1e-6), 1.0 - 1e-6)


def logit(probability: float) -> float:
    probability = _clip_probability(probability)
    return log(probability / (1.0 - probability))


def logistic(score: float) -> float:
    return 1.0 / (1.0 + exp(-score))


@dataclass(frozen=True)
class BayesianUpdateResult:
    prior: float
    posterior: float
    signal_score: float
    contributions: dict[str, float]


@dataclass(frozen=True)
class BayesianLogitModel:
    """
    Deterministic Bayesian-style updater in log-odds space.

    Each feature contributes a log-likelihood-style shift against the market prior.
    """

    weights: dict[str, float]
    intercept: float = 0.0

    def predict(self, market_prior: float, features: dict[str, float]) -> BayesianUpdateResult:
        contributions: dict[str, float] = {}
        score = self.intercept
        for feature_name, weight in self.weights.items():
            value = features.get(feature_name, 0.0)
            contribution = weight * value
            contributions[feature_name] = contribution
            score += contribution
        posterior = logistic(logit(market_prior) + score)
        return BayesianUpdateResult(
            prior=market_prior,
            posterior=posterior,
            signal_score=score,
            contributions=contributions,
        )


DEFAULT_BAYESIAN_MODEL = BayesianLogitModel(
    weights={
        "rolling_sentiment": 0.9,
        "shock_intensity": -0.8,
        "topic_concentration": 0.35,
        "official_meeting_count_7d": 0.25,
        "ceasefire_reference_count_7d": 0.3,
        "cross_border_strike_indicator_7d": -0.45,
        "force_movement_count_7d": -0.2,
        "liquidity_depth_score": 0.18,
        "elite_fragmentation_score": -0.22,
        "momentum": 2.2,
        "volatility": -1.0,
        "order_flow_imbalance": 0.6,
        "oil_stress": -0.9,
        "rates_stress": -0.3,
        "usd_strength": -0.25,
        "macro_stress": -0.5,
    }
)
