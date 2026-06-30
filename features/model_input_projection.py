"""Project registry-aligned political features into compact model inputs."""

from __future__ import annotations


def _bounded(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def project_registry_to_bayesian_inputs(registry_features: dict[str, float]) -> dict[str, float]:
    """
    Reduce the larger registry taxonomy into the compact feature set used by the current fitted models.
    """

    cooperation = registry_features.get("goldstein_cooperation_sum_7d", 0.0)
    conflict = registry_features.get("goldstein_conflict_sum_7d", 0.0)
    total_goldstein = cooperation + conflict + 1.0
    rolling_sentiment = _bounded((cooperation - conflict + total_goldstein) / (2.0 * total_goldstein))
    shock_intensity = _bounded(registry_features.get("shock_event_count_3d", 0.0) / 3.0)

    dominant_mass = max(
        registry_features.get("cameo_conflict_count_7d", 0.0),
        registry_features.get("cameo_cooperation_count_7d", 0.0),
        registry_features.get("official_meeting_count_7d", 0.0),
    )
    total_mass = (
        registry_features.get("cameo_conflict_count_7d", 0.0)
        + registry_features.get("cameo_cooperation_count_7d", 0.0)
        + registry_features.get("official_meeting_count_7d", 0.0)
        + 1.0
    )
    topic_concentration = _bounded(dominant_mass / total_mass)

    return {
        "rolling_sentiment": rolling_sentiment,
        "shock_intensity": shock_intensity,
        "topic_concentration": topic_concentration,
        "official_meeting_count_7d": registry_features.get("official_meeting_count_7d", 0.0),
        "ceasefire_reference_count_7d": registry_features.get("ceasefire_reference_count_7d", 0.0),
        "cross_border_strike_indicator_7d": registry_features.get("cross_border_strike_indicator_7d", 0.0),
        "force_movement_count_7d": registry_features.get("force_movement_count_7d", 0.0),
        "liquidity_depth_score": registry_features.get("liquidity_depth_score", 0.0),
        "elite_fragmentation_score": registry_features.get("elite_fragmentation_score", 0.0),
        "momentum": registry_features.get("market_momentum_1d", 0.0),
        "volatility": registry_features.get("market_volatility_7d", 0.0),
        "order_flow_imbalance": registry_features.get("order_flow_imbalance_1d", 0.0),
        "oil_stress": registry_features.get("oil_stress", 0.0),
        "rates_stress": registry_features.get("rates_stress", 0.0),
        "usd_strength": registry_features.get("usd_strength", 0.0),
        "macro_stress": registry_features.get("macro_stress", 0.0),
    }


def project_registry_to_hazard_inputs(registry_features: dict[str, float]) -> dict[str, float]:
    bayesian_inputs = project_registry_to_bayesian_inputs(registry_features)
    return {
        "rolling_sentiment": bayesian_inputs["rolling_sentiment"],
        "shock_intensity": bayesian_inputs["shock_intensity"],
        "official_meeting_count_7d": registry_features.get("official_meeting_count_7d", 0.0),
        "cross_border_strike_indicator_7d": registry_features.get("cross_border_strike_indicator_7d", 0.0),
        "momentum": registry_features.get("market_momentum_1d", 0.0),
        "oil_stress": registry_features.get("oil_stress", 0.0),
        "days_since_last_major_event": registry_features.get("days_since_last_major_event", 0.0),
        "scheduled_meeting_within_7d": registry_features.get("scheduled_meeting_within_7d", 0.0),
        "decision_window_indicator": registry_features.get("decision_window_indicator", 0.0),
        "calendar_congestion_score": registry_features.get("calendar_congestion_score", 0.0),
    }
