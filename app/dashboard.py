"""Minimal runnable dashboard-style entry point for the quant engine."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from backtest.backtest_engine import evaluate_predictions
from data.live_macro_client import fetch_live_macro_series
from data.live_market_client import fetch_live_polymarket_snapshots
from data.live_news_client import fetch_live_news
from data.historical_snapshot_store import HistoricalSnapshotStore
from features.macro_features import extract_macro_features
from features.market_features import extract_market_features
from features.model_input_projection import (
    project_registry_to_bayesian_inputs,
    project_registry_to_hazard_inputs,
)
from features.model_schema import (
    REQUIRED_BAYESIAN_INPUTS,
    REQUIRED_HAZARD_INPUTS,
    explain_model_input_roles,
    validate_model_inputs,
)
from features.news_features import extract_news_features
from features.political_feature_engine import assemble_political_features
from features.variable_registry import get_columns_for_model
from models.bayesian_model import DEFAULT_BAYESIAN_MODEL
from models.deadline_hazard_model import fit_deadline_hazard_model
from models.decision_layer import build_trade_decision
from models.ensemble_model import combine_probabilities, random_forest_proxy
from models.hmm_model import infer_regimes
from models.performance_log import build_performance_log, summarize_performance_log
from models.transparency_log import build_bucket_prediction_curve
from models.training_pipeline import load_sample_training_data, train_from_dataset


def _build_live_or_fallback_inputs() -> dict[str, object]:
    use_live = os.environ.get("PROJECTZERO_USE_REAL_DATA", "1") != "0"
    if not use_live:
        return {"mode": "fallback"}

    market_error = None
    news_error = None
    macro_error = None
    live_market = []
    live_news = []
    live_macro = None

    try:
        live_market = fetch_live_polymarket_snapshots()
    except Exception as error:
        market_error = str(error)
    try:
        live_news = fetch_live_news()
    except Exception as error:
        news_error = str(error)
    try:
        live_macro = fetch_live_macro_series()
    except Exception as error:
        macro_error = str(error)

    if not live_market:
        return {
            "mode": "fallback",
            "reason": market_error or "no_live_market",
            "component_status": {
                "market": "failed",
                "news": "live" if live_news else "failed",
                "macro": "live" if live_macro else "failed",
            },
        }

    market_series = [
        {
            "probability": live_market[0].yes_price,
            "yes_volume": live_market[0].volume,
            "no_volume": max(0.0, live_market[0].liquidity - live_market[0].volume),
        }
    ]
    market_series.extend(
        {
            "probability": snapshot.yes_price,
            "yes_volume": snapshot.volume,
            "no_volume": max(0.0, snapshot.liquidity - snapshot.volume),
        }
        for snapshot in live_market[1:3]
    )
    news_events = [
        {
            "timestamp": int(datetime.fromisoformat(item.published_at.replace("Z", "+00:00")).timestamp()),
            "headline": item.headline,
            "summary": item.summary,
        }
        for item in live_news[:8]
    ]
    if not news_events:
        news_events = [
            {
                "timestamp": int(datetime.now(timezone.utc).timestamp()),
                "headline": "No keyword-matched live headlines were available; market data remains live.",
                "summary": "The news fetch completed but the tracked geopolitical keyword window was empty.",
            }
        ]

    return {
        "mode": "live",
        "news_events": news_events,
        "market_series": market_series,
        "macro_series": live_macro,
        "bucket_market_prices": {
            snapshot.market_id: snapshot.yes_price
            for snapshot in live_market
        },
        "freshness": {
            "market_fetched_at": max(snapshot.fetched_at for snapshot in live_market),
            "news_fetched_at": max(item.fetched_at for item in live_news) if live_news else None,
            "macro_observed_end": "latest_fred_window" if live_macro else None,
            "live_market_buckets": [snapshot.market_id for snapshot in live_market],
            "live_news_count": len(live_news),
            "component_status": {
                "market": "live",
                "news": "live" if live_news else f"fallback:{news_error or 'no_matches'}",
                "macro": "live" if live_macro else f"fallback:{macro_error or 'missing'}",
            },
        },
    }


def run_demo() -> dict[str, object]:
    dataset_path = Path(__file__).resolve().parents[1] / "data" / "training" / "sample_training_data.json"
    dataset = load_sample_training_data(dataset_path)
    artifacts = train_from_dataset(dataset_path)
    hazard_model = fit_deadline_hazard_model(dataset["hazard_samples"])
    runtime_inputs = _build_live_or_fallback_inputs()
    news_events = [
        {
            "timestamp": 1712865600,
            "headline": "Diplomatic talks resume as officials discuss Hormuz shipping risks",
            "summary": "Negotiators described cautious progress while oil traders kept a close eye on disruptions.",
        },
        {
            "timestamp": 1712869200,
            "headline": "Breaking: regional strike threat raises sanctions concerns",
            "summary": "Officials warned that any attack could escalate conflict and pressure crude prices higher.",
        },
        {
            "timestamp": 1712872800,
            "headline": "Vice president meets allies to push a ceasefire framework",
            "summary": "The meeting was framed as diplomatic, though no deal has been signed.",
        },
    ]
    market_series = [
        {"probability": 0.39, "yes_volume": 1200.0, "no_volume": 1500.0},
        {"probability": 0.41, "yes_volume": 1500.0, "no_volume": 1480.0},
        {"probability": 0.44, "yes_volume": 1620.0, "no_volume": 1490.0},
    ]
    macro_series = [
        {"oil_price": 82.0, "bond_yield": 4.21, "usd_index": 104.2},
        {"oil_price": 84.3, "bond_yield": 4.27, "usd_index": 104.8},
    ]
    contract_context = {
        "days_to_deadline": 7,
        "hours_to_deadline": 168,
        "days_since_last_major_event": 2,
        "scheduled_meeting_within_7d": 1,
        "decision_window_indicator": 1,
        "calendar_congestion_score": 2,
        "liquidity_depth_score": 0.78,
        "spread_proxy": 0.03,
        "vdem_regime_score": 0.42,
        "elite_fragmentation_score": 0.31,
    }
    if runtime_inputs["mode"] == "live":
        news_events = runtime_inputs["news_events"]
        market_series = runtime_inputs["market_series"]
        if runtime_inputs["macro_series"] is not None:
            macro_series = runtime_inputs["macro_series"]
    bucket_market_prices = runtime_inputs.get(
        "bucket_market_prices",
        {
            "apr-15": 0.39,
            "apr-21": 0.41,
            "apr-30": 0.44,
            "may-31": 0.46,
            "jun-30": 0.48,
        },
    )

    news_features = extract_news_features(news_events)
    market_features = extract_market_features(market_series)
    macro_features = extract_macro_features(macro_series)
    registry_features = assemble_political_features(
        news_events=news_events,
        market_series=market_series,
        macro_series=macro_series,
        contract_context=contract_context,
    )
    projected_bayesian_inputs = project_registry_to_bayesian_inputs(registry_features)
    projected_hazard_inputs = project_registry_to_hazard_inputs(registry_features)
    bayesian_schema = validate_model_inputs(projected_bayesian_inputs, REQUIRED_BAYESIAN_INPUTS)
    hazard_schema = validate_model_inputs(projected_hazard_inputs, REQUIRED_HAZARD_INPUTS)
    numeric_features = {
        key: value
        for key, value in {**news_features, **market_features, **macro_features}.items()
        if isinstance(value, float)
    }

    bayesian = DEFAULT_BAYESIAN_MODEL.predict(
        market_prior=market_features["market_prob"],
        features=projected_bayesian_inputs,
    )
    trained_bayesian = artifacts.bayesian_model.predict(
        market_prior=market_features["market_prob"],
        features=projected_bayesian_inputs,
    )
    regime = infer_regimes(
        projected_bayesian_inputs,
        transition_matrix=artifacts.regime_model.transition_matrix,
    )
    regime_probability = 0.5 + 0.5 * regime.regime_score
    ml_proxy_probability = random_forest_proxy(numeric_features)
    ensemble = combine_probabilities(
        {
            "bayesian": trained_bayesian.posterior,
            "regime": max(0.0, min(1.0, regime_probability)),
            "ml_proxy": ml_proxy_probability,
        }
    )
    calibrated_probability = artifacts.calibrator.calibrate(ensemble.probability)
    by_deadline_probability = hazard_model.probability_by_deadline(
        base_probability=calibrated_probability,
        horizon_days=7,
        features=projected_hazard_inputs,
    )
    trade_decision = build_trade_decision(
        model_probability=by_deadline_probability,
        market_probability=market_features["market_prob"],
        confidence=ensemble.confidence,
        liquidity_quality=0.78,
    )
    backtest = evaluate_predictions(
        market_predictions=dataset["evaluation_set"]["market_predictions"],
        model_predictions=[
            artifacts.calibrator.calibrate(
                artifacts.bayesian_model.predict(float(sample["market_prob"]), sample["features"]).posterior
            )
            for sample in dataset["bayesian_samples"]
        ],
        outcomes=dataset["evaluation_set"]["outcomes"],
    )
    historical_model_predictions = [
        artifacts.calibrator.calibrate(
            artifacts.bayesian_model.predict(float(sample["market_prob"]), sample["features"]).posterior
        )
        for sample in dataset["bayesian_samples"]
    ]
    performance_log = build_performance_log(
        market_predictions=dataset["evaluation_set"]["market_predictions"],
        model_predictions=historical_model_predictions,
        outcomes=dataset["evaluation_set"]["outcomes"],
    )
    performance_summary = summarize_performance_log(performance_log)
    bucket_curve = build_bucket_prediction_curve(
        now=datetime.now(timezone.utc),
        bucket_market_prices=bucket_market_prices,
        base_probability=calibrated_probability,
        hazard_model=hazard_model,
        hazard_features=projected_hazard_inputs,
    )
    sorted_contributions = sorted(
        trained_bayesian.contributions.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
    store = HistoricalSnapshotStore(Path(__file__).resolve().parents[1] / "data" / "training" / "demo_snapshots.jsonl")
    store.append(
        {
            "kind": "demo_run",
            "data_mode": runtime_inputs["mode"],
            "market_probability": market_features["market_prob"],
            "trained_model_probability": trained_bayesian.posterior,
            "calibrated_probability": calibrated_probability,
            "by_deadline_probability": by_deadline_probability,
            "current_edge": calibrated_probability - market_features["market_prob"],
            "bucket_curve": [entry.__dict__ for entry in bucket_curve],
        }
    )
    stored_snapshots = [
        entry
        for entry in store.load_all()
        if entry.get("kind") == "demo_run"
    ]

    return {
        "market_probability": market_features["market_prob"],
        "hand_tuned_probability": ensemble.probability,
        "model_probability": calibrated_probability,
        "deadline_probability_7d": by_deadline_probability,
        "data_freshness": runtime_inputs.get("freshness", {"mode": "fallback", "reason": runtime_inputs.get("reason")}),
        "edge": calibrated_probability - market_features["market_prob"],
        "confidence": ensemble.confidence,
        "trade_decision": trade_decision.__dict__,
        "current_run_assessment": {
            "resolved": False,
            "status": "unresolved",
            "note": "The current live run cannot be labeled as worked or failed until the contract resolves.",
            "why_model_differs_from_market": [
                {
                    "feature": feature,
                    "contribution": contribution,
                }
                for feature, contribution in sorted_contributions[:5]
            ],
            "justification": {
                "market_probability": market_features["market_prob"],
                "model_probability": calibrated_probability,
                "edge": calibrated_probability - market_features["market_prob"],
                "deadline_probability_7d": by_deadline_probability,
            },
        },
        "historical_performance_log": {
            "summary": performance_summary,
            "entries": [entry.__dict__ for entry in performance_log],
        },
        "investor_transparency_log": {
            "current_curve": [entry.__dict__ for entry in bucket_curve],
            "daily_snapshots": [
                {
                    "timestamp": entry.get("timestamp", f"snapshot-{index + 1}"),
                    "data_mode": entry.get("data_mode"),
                    "bucket_curve": entry.get("bucket_curve", []),
                }
                for index, entry in enumerate(stored_snapshots[-14:])
            ],
            "note": "Current run is unresolved; this log is for transparent timestamped model-vs-market comparison by deadline bucket.",
        },
        "how_model_works": [
            "1. Market price supplies the prior probability.",
            "2. Registry-aligned political variables are projected into compact Bayesian and hazard inputs.",
            "3. A fitted Bayesian log-odds model adjusts the market prior using those projected inputs.",
            "4. A regime model tracks calm, escalation, and de-escalation state persistence.",
            "5. A nonlinear proxy adds interaction sensitivity.",
            "6. The ensemble output is Platt-calibrated on historical samples.",
            "7. A deadline hazard model converts static probability into probability by deadline.",
            "8. A decision layer translates the final probability into edge, EV, and Kelly-style size.",
        ],
        "projected_model_inputs": {
            "bayesian": projected_bayesian_inputs,
            "hazard": projected_hazard_inputs,
        },
        "schema_health": {
            "bayesian": bayesian_schema.__dict__,
            "hazard": hazard_schema.__dict__,
            "input_roles": explain_model_input_roles(),
        },
        "legacy_numeric_snapshot": numeric_features,
        "registry_feature_snapshot": {
            "hazard_columns": {
                name: registry_features[name]
                for name in get_columns_for_model("hazard")
                if name in registry_features
            },
            "decision_columns": {
                name: registry_features[name]
                for name in get_columns_for_model("decision")
                if name in registry_features
            },
        },
        "trained_parameters": {
            "bayesian_intercept": artifacts.bayesian_model.intercept,
            "bayesian_weights": artifacts.bayesian_model.weights,
            "calibration": {"a": artifacts.calibrator.a, "b": artifacts.calibrator.b},
            "regime_transitions": artifacts.regime_model.transition_matrix,
            "hazard_intercept": hazard_model.intercept,
            "hazard_weights": hazard_model.weights,
            "training_loss": artifacts.training_loss,
        },
        "drivers": {
            "news": news_features,
            "market": market_features,
            "macro": macro_features,
            "registry_features": registry_features,
            "hand_tuned_bayesian_contributions": bayesian.contributions,
            "bayesian_contributions": trained_bayesian.contributions,
            "regimes": regime.regime_probabilities,
        },
        "backtest": backtest.__dict__,
        "snapshot_count": len(store.load_all()),
    }


if __name__ == "__main__":
    print(json.dumps(run_demo(), indent=2, sort_keys=True))
