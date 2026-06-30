"""Expected value and position sizing helpers."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TradeDecision:
    model_probability: float
    market_probability: float
    edge: float
    expected_value_yes: float
    uncertainty_penalty: float
    liquidity_adjustment: float
    adjusted_edge: float
    kelly_fraction: float
    suggested_size: str


def _size_bucket(kelly_fraction: float) -> str:
    if kelly_fraction >= 0.12:
        return "large"
    if kelly_fraction >= 0.05:
        return "medium"
    if kelly_fraction > 0.0:
        return "small"
    return "none"


def build_trade_decision(
    model_probability: float,
    market_probability: float,
    confidence: float,
    liquidity_quality: float,
) -> TradeDecision:
    """
    Build a simple decision summary using EV, uncertainty, and fractional Kelly logic.
    """

    implied_yes_payout = max(1e-6, 1.0 - market_probability)
    expected_value_yes = (model_probability * implied_yes_payout) - ((1.0 - model_probability) * market_probability)
    edge = model_probability - market_probability
    uncertainty_penalty = (1.0 - confidence) * 0.5
    liquidity_adjustment = max(0.2, min(1.0, liquidity_quality))
    adjusted_edge = edge - uncertainty_penalty * (1.0 - liquidity_adjustment)
    denominator = max(implied_yes_payout, 1e-6)
    kelly_fraction = max(0.0, min(0.25, adjusted_edge / denominator))
    return TradeDecision(
        model_probability=model_probability,
        market_probability=market_probability,
        edge=edge,
        expected_value_yes=expected_value_yes,
        uncertainty_penalty=uncertainty_penalty,
        liquidity_adjustment=liquidity_adjustment,
        adjusted_edge=adjusted_edge,
        kelly_fraction=kelly_fraction,
        suggested_size=_size_bucket(kelly_fraction),
    )
