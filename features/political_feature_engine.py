"""Registry-aligned political feature assembly from raw news, market, and macro inputs."""

from __future__ import annotations

from typing import Iterable

from features.macro_features import extract_macro_features
from features.market_features import extract_market_features
from features.news_features import classify_sentiment


MEETING_TERMS = {"meeting", "talks", "summit", "call", "negotiation", "diplomatic"}
CEASEFIRE_TERMS = {"ceasefire", "truce", "pause", "deal", "agreement"}
BACKCHANNEL_TERMS = {"backchannel", "secret", "indirect", "mediator"}
MEDIATOR_TERMS = {"qatar", "oman", "mediator", "intermediary", "european"}
MISSILE_TERMS = {"missile", "bomber", "strike", "air defense", "sortie"}
MOBILIZATION_TERMS = {"mobilize", "deployment", "readiness", "carrier", "troops"}
PROTEST_TERMS = {"protest", "demonstration", "unrest"}
REPRESSION_TERMS = {"crackdown", "arrest", "repression"}


def _text(event: dict[str, object]) -> str:
    return f"{event.get('headline', '')} {event.get('summary', '')}".strip().lower()


def _count_matches(events: Iterable[dict[str, object]], terms: set[str]) -> int:
    count = 0
    for event in events:
        text = _text(event)
        if any(term in text for term in terms):
            count += 1
    return count


def assemble_political_features(
    news_events: list[dict[str, object]],
    market_series: list[dict[str, float]],
    macro_series: list[dict[str, float]],
    contract_context: dict[str, float | int | bool] | None = None,
) -> dict[str, float]:
    """
    Build a registry-aligned feature vector.

    The first implementation uses transparent heuristics rather than external event coders.
    This keeps the schema stable while leaving room for better data sources later.
    """

    contract = contract_context or {}
    market = extract_market_features(market_series)
    macro = extract_macro_features(macro_series)

    sentiments = [classify_sentiment(_text(event)) for event in news_events]
    negative_events = sum(sentiment < 0 for sentiment in sentiments)
    positive_events = sum(sentiment > 0 for sentiment in sentiments)
    severe_negative_events = sum(sentiment <= -0.2 for sentiment in sentiments)
    severe_positive_events = sum(sentiment >= 0.2 for sentiment in sentiments)
    total_events = max(len(news_events), 1)

    meeting_count = _count_matches(news_events, MEETING_TERMS)
    ceasefire_count = _count_matches(news_events, CEASEFIRE_TERMS)
    backchannel_count = _count_matches(news_events, BACKCHANNEL_TERMS)
    mediator_count = _count_matches(news_events, MEDIATOR_TERMS)
    missile_count = _count_matches(news_events, MISSILE_TERMS)
    mobilization_count = _count_matches(news_events, MOBILIZATION_TERMS)
    protest_count = _count_matches(news_events, PROTEST_TERMS)
    repression_count = _count_matches(news_events, REPRESSION_TERMS)

    return {
        "cameo_conflict_count_1d": float(negative_events),
        "cameo_conflict_count_7d": float(negative_events),
        "goldstein_conflict_sum_7d": float(sum(abs(sentiment) for sentiment in sentiments if sentiment < 0)),
        "battle_event_count_7d": float(severe_negative_events),
        "fatality_count_7d": float(contract.get("fatality_count_7d", 0.0)),
        "cross_border_strike_indicator_7d": float(contract.get("cross_border_strike_indicator_7d", 0.0)),
        "shock_event_count_3d": float(severe_negative_events + severe_positive_events),
        "cameo_cooperation_count_1d": float(positive_events),
        "cameo_cooperation_count_7d": float(positive_events),
        "goldstein_cooperation_sum_7d": float(sum(sentiment for sentiment in sentiments if sentiment > 0)),
        "official_meeting_count_7d": float(meeting_count),
        "ceasefire_reference_count_7d": float(ceasefire_count),
        "diplomatic_progress_score_7d": float((meeting_count + ceasefire_count + mediator_count) / total_events),
        "violence_decline_ratio_7d": float(contract.get("violence_decline_ratio_7d", 0.0)),
        "official_talks_count_7d": float(meeting_count),
        "backchannel_reference_count_7d": float(backchannel_count),
        "mediator_activity_count_7d": float(mediator_count),
        "agreement_draft_indicator_7d": float(contract.get("agreement_draft_indicator_7d", 0.0)),
        "joint_statement_indicator_7d": float(contract.get("joint_statement_indicator_7d", 0.0)),
        "negotiation_cadence_gap_days": float(contract.get("negotiation_cadence_gap_days", 0.0)),
        "air_sortie_signal_3d": float(missile_count),
        "force_movement_count_7d": float(mobilization_count),
        "weapons_deployment_indicator_7d": float(contract.get("weapons_deployment_indicator_7d", 0.0)),
        "missile_reference_count_7d": float(missile_count),
        "mobilization_reference_count_7d": float(mobilization_count),
        "pentagon_alert_score_3d": float((missile_count + mobilization_count) / total_events),
        "vdem_regime_score": float(contract.get("vdem_regime_score", 0.5)),
        "elite_fragmentation_score": float(contract.get("elite_fragmentation_score", 0.0)),
        "protest_event_count_30d": float(protest_count),
        "repression_event_count_30d": float(repression_count),
        "inflation_stress_score": float(contract.get("inflation_stress_score", 0.0)),
        "gdp_growth_proxy": float(contract.get("gdp_growth_proxy", 0.0)),
        "instability_history_count_365d": float(contract.get("instability_history_count_365d", 0.0)),
        "days_to_deadline": float(contract.get("days_to_deadline", 0.0)),
        "hours_to_deadline": float(contract.get("hours_to_deadline", 0.0)),
        "days_since_last_major_event": float(contract.get("days_since_last_major_event", 0.0)),
        "scheduled_meeting_within_7d": float(contract.get("scheduled_meeting_within_7d", 0.0)),
        "decision_window_indicator": float(contract.get("decision_window_indicator", 0.0)),
        "calendar_congestion_score": float(contract.get("calendar_congestion_score", 0.0)),
        "market_prob": market["market_prob"],
        "market_momentum_1d": market["momentum"],
        "market_momentum_7d": float(contract.get("market_momentum_7d", market["momentum"])),
        "market_volatility_7d": market["volatility"],
        "order_flow_imbalance_1d": market["order_flow_imbalance"],
        "liquidity_depth_score": float(contract.get("liquidity_depth_score", 0.5)),
        "spread_proxy": float(contract.get("spread_proxy", 0.0)),
        "oil_stress": macro["oil_stress"],
        "rates_stress": macro["rates_stress"],
        "usd_strength": macro["usd_strength"],
        "macro_stress": macro["macro_stress"],
    }
