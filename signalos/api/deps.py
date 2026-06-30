from __future__ import annotations

import threading
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from signalos.backtest.harness import midnight_hammer_replay, run_loo_cv
from signalos.backtest.ground_truth import build_labeled_operation_windows
from signalos.config import HISTORICAL_OPERATIONS, MODEL_DIR
from signalos.features.pipeline import build_all
from signalos.ingestion.polymarket import PolymarketClient
from signalos.models.dtw import template_dict
from signalos.models.hmm import PhaseHMM
from signalos.models.survival import PhaseToKineticSurvival
from signalos.models.train import train_models
from signalos.polymarket.edge import edge_with_sizing, phase_to_market_prob


FEATURE_COLUMNS = [
    "tanker_sortie_z",
    "b2_dg_ramp_count",
    "csg_centcom_count",
    "ordered_departure_iraq",
    "israeli_activity_spike",
    "trump_two_weeks_pattern",
    "signal_quality_score_composite",
]

OPERATION_LABELS = {item["name"]: item["name"].replace("_", " ").title() for item in HISTORICAL_OPERATIONS}
OPERATION_LABELS.update(
    {
        "midnight_hammer": "Operation Midnight Hammer",
        "desert_storm": "Desert Shield / Storm",
        "desert_fox": "Operation Desert Fox",
        "enduring_freedom": "Operation Enduring Freedom",
        "iraqi_freedom": "Operation Iraqi Freedom",
        "odyssey_dawn": "Operation Odyssey Dawn",
        "syria_2017": "Syria 2017 Strike",
        "syria_2018": "Syria 2018 Strike",
        "soleimani": "Soleimani Strike",
        "epic_fury": "Operation Epic Fury",
    }
)

PAYLOAD_CACHE_TTL_SECONDS = 10.0
MODEL_METADATA_CACHE_TTL_SECONDS = 60.0

_payload_cache_lock = threading.Lock()
_payload_cache: dict[str, object] = {"expires_at": 0.0, "value": None}
_payload_inflight = threading.Event()
_payload_inflight.clear()
_payload_inflight_active = False

_model_cache_lock = threading.Lock()
_model_cache: dict[str, object] = {"expires_at": 0.0, "value": None}
_model_inflight = threading.Event()
_model_inflight.clear()
_model_inflight_active = False


def current_phase_payload() -> dict:
    global _payload_inflight_active
    compute_here = False
    while True:
        now = time.monotonic()
        with _payload_cache_lock:
            cached_value = _payload_cache["value"]
            if cached_value is not None and float(_payload_cache["expires_at"]) > now:
                return cached_value  # type: ignore[return-value]
            if not _payload_inflight_active:
                _payload_inflight_active = True
                _payload_inflight.clear()
                compute_here = True
                break
            wait_event = _payload_inflight
        wait_event.wait(timeout=PAYLOAD_CACHE_TTL_SECONDS)

    try:
        daily = build_all()
        latest = daily.iloc[-1]
        previous = daily.iloc[-2] if len(daily) > 1 else None
        latest_observed_at = pd.Timestamp(latest.get("date", pd.Timestamp.utcnow())).isoformat()
        previous_observed_at = (
            pd.Timestamp(previous.get("date", latest.get("date", pd.Timestamp.utcnow()))).isoformat()
            if previous is not None
            else None
        )
        if not (MODEL_DIR / "phase_hmm.pkl").exists():
            train_models()
        if not (MODEL_DIR / "survival.pkl").exists():
            train_models()
        hmm = PhaseHMM().load(str(MODEL_DIR / "phase_hmm.pkl"))
        survival = PhaseToKineticSurvival()
        survival.model = joblib.load(MODEL_DIR / "survival.pkl")
        X = daily[FEATURE_COLUMNS].to_numpy(dtype=float)
        posterior = hmm.predict_proba(X)[-1].tolist()
        phase = int(np.argmax(posterior))
        covariates = pd.DataFrame(
            [
                {
                    "phase_posterior_3": posterior[3],
                    "phase_posterior_4": posterior[4],
                    "tanker_z": latest["tanker_sortie_z"],
                    "b2_dg_ramp": latest["b2_dg_ramp_count"],
                    "csg_centcom": latest["csg_centcom_count"],
                    "composite_sqs": latest["signal_quality_score_composite"],
                    "operation_type_strike": 1.0,
                }
            ]
        )
        horizons = {
            "within_24h": float(survival.p_kinetic_within(1, covariates)),
            "within_72h": float(survival.p_kinetic_within(3, covariates)),
            "within_7d": float(survival.p_kinetic_within(7, covariates)),
            "within_30d": float(survival.p_kinetic_within(30, covariates)),
        }
        phase_risk_scale = min(
            1.0,
            max(
                posterior[3] * 0.6 + posterior[4] * 0.85 + posterior[5],
                0.03 if phase == 0 else 0.05 * phase,
            ),
        )
        horizons = {key: float(min(1.0, value * phase_risk_scale)) for key, value in horizons.items()}
        labeled = build_labeled_operation_windows()
        template_source = labeled.copy()
        template_source["signal_stack"] = (
            template_source["phase"] * 0.4
            + template_source["tanker_sortie_z"] * 0.2
            + template_source["b2_dg_ramp_count"] * 0.15
            + template_source["csg_centcom_count"] * 0.15
            + template_source["ordered_departure_iraq"] * 0.1
        )
        templates = template_dict(template_source, value_column="signal_stack")
        recent = daily.tail(30).copy()
        recent["signal_stack"] = (
            recent["tanker_sortie_z"] * 0.3
            + recent["b2_dg_ramp_count"] * 0.2
            + recent["csg_centcom_count"] * 0.2
            + recent["ordered_departure_iraq"] * 0.15
            + recent["signal_quality_score_composite"] * 0.15
        )
        recent_vector = recent["signal_stack"].to_numpy(dtype=float)
        analog_scores = []
        for name, series in templates.items():
            score = float(np.linalg.norm(recent_vector - series[-len(recent_vector) :]))
            analog_scores.append({"operation_id": name, "label": OPERATION_LABELS.get(name, name), "distance": score})
        analog_scores.sort(key=lambda item: item["distance"])
        watch_features = [
            "tanker_sortie_z",
            "b2_dg_ramp_count",
            "csg_centcom_count",
            "ordered_departure_iraq",
            "israeli_activity_spike",
            "trump_two_weeks_pattern",
            "signal_quality_score_composite",
        ]
        change_monitor = []
        if previous is not None:
            for feature in watch_features:
                current_value = float(latest.get(feature, 0.0))
                previous_value = float(previous.get(feature, 0.0))
                delta = current_value - previous_value
                if abs(delta) > 1e-9:
                    change_monitor.append(
                        {
                            "name": feature,
                            "current": current_value,
                            "previous": previous_value,
                            "delta": delta,
                            "observed_at": latest_observed_at,
                            "previous_observed_at": previous_observed_at,
                        }
                    )
        change_monitor = sorted(change_monitor, key=lambda item: abs(item["delta"]), reverse=True)[:5]
        sparkline_features = [
            "tanker_sortie_z",
            "b2_dg_ramp_count",
            "csg_centcom_count",
            "signal_quality_score_composite",
        ]
        recent_window = daily.tail(7)
        signal_pulses = []
        for feature in sparkline_features:
            values = [float(value) for value in recent_window[feature].fillna(0.0).tolist()]
            timestamps = [
                pd.Timestamp(value).isoformat()
                for value in recent_window.get("date", pd.Series(recent_window.index, index=recent_window.index)).tolist()
            ]
            signal_pulses.append(
                {
                    "name": feature,
                    "values": values,
                    "current": values[-1] if values else 0.0,
                    "timestamps": timestamps,
                    "observed_at": timestamps[-1] if timestamps else latest_observed_at,
                }
            )
        pca_window = daily[FEATURE_COLUMNS].tail(min(len(daily), 90)).fillna(0.0)
        pca_payload = None
        if len(pca_window) >= 3:
            scaler = StandardScaler()
            scaled = scaler.fit_transform(pca_window.to_numpy(dtype=float))
            n_components = min(3, scaled.shape[0], scaled.shape[1])
            total_variance = float(np.nanvar(scaled, axis=0).sum())
            if n_components >= 1 and total_variance > 1e-12:
                pca = PCA(n_components=n_components, random_state=42)
                transformed = pca.fit_transform(scaled)
                current_scores = transformed[-1].tolist()
                components = []
                for index, vector in enumerate(pca.components_):
                    ranked = sorted(
                        [
                            {"feature": feature, "loading": float(loading)}
                            for feature, loading in zip(FEATURE_COLUMNS, vector.tolist())
                        ],
                        key=lambda item: abs(item["loading"]),
                        reverse=True,
                    )
                    components.append(
                        {
                            "name": f"PC{index + 1}",
                            "explained_variance_ratio": float(pca.explained_variance_ratio_[index]),
                            "score": float(current_scores[index]),
                            "top_loadings": ranked[:4],
                        }
                    )
                pca_payload = {
                    "window_size": int(len(pca_window)),
                    "observed_at": latest_observed_at,
                    "components": components,
                }
            elif n_components >= 1:
                pca_payload = {
                    "window_size": int(len(pca_window)),
                    "observed_at": latest_observed_at,
                    "components": [],
                }
        payload = {
            "phase": phase,
            "posterior": posterior,
            "features": latest.to_dict(),
            "observed_at": latest_observed_at,
            "time_to_kinetic": horizons,
            "top_analogs": analog_scores[:3],
            "change_monitor": change_monitor,
            "signal_pulses": signal_pulses,
            "pca": pca_payload,
            "last_update": pd.Timestamp.utcnow().isoformat(),
        }
        with _payload_cache_lock:
            _payload_cache["value"] = payload
            _payload_cache["expires_at"] = time.monotonic() + PAYLOAD_CACHE_TTL_SECONDS
        return payload
    finally:
        with _payload_cache_lock:
            if compute_here:
                _payload_inflight_active = False
                _payload_inflight.set()


async def market_payload() -> list[dict]:
    phase_payload = current_phase_payload()
    if not (MODEL_DIR / "survival.pkl").exists():
        train_models()
    feature_row = phase_payload["features"]
    covariates = pd.DataFrame(
        [
            {
                "phase_posterior_3": phase_payload["posterior"][3],
                "phase_posterior_4": phase_payload["posterior"][4],
                "tanker_z": feature_row["tanker_sortie_z"],
                "b2_dg_ramp": feature_row["b2_dg_ramp_count"],
                "csg_centcom": feature_row["csg_centcom_count"],
                "composite_sqs": feature_row["signal_quality_score_composite"],
                "operation_type_strike": 1.0,
            }
        ]
    )
    client = PolymarketClient()
    markets = await client.discover_iran_markets()
    enriched = []
    for market in markets:
        token_id = market.get("token_id_yes")
        if not token_id:
            continue
        mid = client.get_midpoint(token_id) if token_id.startswith("fallback-") else 0.5
        model_prob = phase_to_market_prob(phase_payload["posterior"], covariates, market)
        if model_prob is None:
            continue
        spread = 0.02
        edge = edge_with_sizing(model_prob, mid or 0.5, spread, market.get("liquidity", 0.0))
        enriched.append({**market, **edge, "token_id": token_id})
    return enriched


def backtest_payload() -> dict:
    return {"loo": run_loo_cv(), "midnight_hammer": midnight_hammer_replay()}


def model_metadata_payload() -> dict:
    global _model_inflight_active
    compute_here = False
    while True:
        now = time.monotonic()
        with _model_cache_lock:
            cached_value = _model_cache["value"]
            if cached_value is not None and float(_model_cache["expires_at"]) > now:
                return cached_value  # type: ignore[return-value]
            if not _model_inflight_active:
                _model_inflight_active = True
                _model_inflight.clear()
                compute_here = True
                break
            wait_event = _model_inflight
        wait_event.wait(timeout=MODEL_METADATA_CACHE_TTL_SECONDS)

    try:
        if not (MODEL_DIR / "phase_hmm.pkl").exists() or not (MODEL_DIR / "survival.pkl").exists():
            train_models()
        hmm = joblib.load(MODEL_DIR / "phase_hmm.pkl")
        survival = joblib.load(MODEL_DIR / "survival.pkl")
        payload = {
            "hmm": {
                "type": type(hmm).__name__,
                "n_components": hmm.n_components,
                "covariance_type": hmm.covariance_type,
                "n_iter": hmm.n_iter,
                "startprob": [float(x) for x in hmm.startprob_.tolist()],
                "transmat_first_row": [float(x) for x in hmm.transmat_[0].tolist()],
                "means_shape": list(getattr(hmm, "means_", np.empty((0, 0))).shape),
                "covars_shape": list(getattr(hmm, "covars_", np.empty((0, 0))).shape),
                "feature_columns": FEATURE_COLUMNS,
                "artifact_path": str(MODEL_DIR / "phase_hmm.pkl"),
            },
            "survival": {
                "type": type(survival).__name__,
                "params_index": [list(item) if isinstance(item, tuple) else item for item in survival.params_.index.tolist()],
                "summary_columns": list(survival.summary.columns),
                "artifact_path": str(MODEL_DIR / "survival.pkl"),
            },
        }
        with _model_cache_lock:
            _model_cache["value"] = payload
            _model_cache["expires_at"] = time.monotonic() + MODEL_METADATA_CACHE_TTL_SECONDS
        return payload
    finally:
        with _model_cache_lock:
            if compute_here:
                _model_inflight_active = False
                _model_inflight.set()
