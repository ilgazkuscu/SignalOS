"""Validation and explainability helpers for compact model schemas."""

from __future__ import annotations

from dataclasses import dataclass


REQUIRED_BAYESIAN_INPUTS = (
    "rolling_sentiment",
    "shock_intensity",
    "topic_concentration",
    "official_meeting_count_7d",
    "ceasefire_reference_count_7d",
    "cross_border_strike_indicator_7d",
    "force_movement_count_7d",
    "liquidity_depth_score",
    "elite_fragmentation_score",
    "momentum",
    "volatility",
    "order_flow_imbalance",
    "oil_stress",
    "rates_stress",
    "usd_strength",
    "macro_stress",
)

REQUIRED_HAZARD_INPUTS = (
    "rolling_sentiment",
    "shock_intensity",
    "official_meeting_count_7d",
    "cross_border_strike_indicator_7d",
    "momentum",
    "oil_stress",
    "days_since_last_major_event",
    "scheduled_meeting_within_7d",
    "decision_window_indicator",
    "calendar_congestion_score",
)


@dataclass(frozen=True)
class SchemaValidationResult:
    valid: bool
    missing_inputs: list[str]
    extra_inputs: list[str]


def validate_model_inputs(
    model_inputs: dict[str, float],
    required_inputs: tuple[str, ...],
) -> SchemaValidationResult:
    missing = [name for name in required_inputs if name not in model_inputs]
    extras = [name for name in model_inputs if name not in required_inputs]
    return SchemaValidationResult(
        valid=not missing,
        missing_inputs=missing,
        extra_inputs=extras,
    )


def explain_model_input_roles() -> dict[str, str]:
    return {
        "rolling_sentiment": "Net cooperative versus conflictual tone derived from registry event balance.",
        "shock_intensity": "Recent concentration of high-salience events, scaled to a bounded range.",
        "topic_concentration": "How concentrated the event flow is around the dominant political theme.",
        "official_meeting_count_7d": "Verified meetings or talks that indicate active diplomatic engagement.",
        "ceasefire_reference_count_7d": "Explicit ceasefire or truce language in the recent information set.",
        "cross_border_strike_indicator_7d": "Binary escalation marker for recent cross-border strike activity.",
        "force_movement_count_7d": "Reported military force movements that raise operational pressure.",
        "liquidity_depth_score": "Ease-of-execution proxy that distinguishes conviction from thin-market noise.",
        "elite_fragmentation_score": "Structural political fragmentation proxy for regime cohesion risk.",
        "momentum": "Recent direction of market repricing.",
        "volatility": "Recent instability of market-implied probability.",
        "order_flow_imbalance": "Net directional pressure from recent trading flow.",
        "oil_stress": "Energy-market stress proxy for geopolitical pressure.",
        "rates_stress": "Rates move proxy for macro risk repricing.",
        "usd_strength": "Dollar strength proxy for global stress and safe-haven demand.",
        "macro_stress": "Composite magnitude of macro dislocation.",
        "days_since_last_major_event": "Catalyst recency gap measuring how stale the last major event is.",
        "scheduled_meeting_within_7d": "Indicator for an upcoming relevant official meeting before expiry.",
        "decision_window_indicator": "Indicator for a known political or legal decision window.",
        "calendar_congestion_score": "Clustered catalyst count in the next week that can accelerate resolution.",
    }
