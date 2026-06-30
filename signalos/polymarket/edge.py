from __future__ import annotations

from datetime import UTC, datetime

import joblib
import pandas as pd

from signalos.config import MODEL_DIR, get_settings
from signalos.polymarket.sizing import kelly_size


def _survival_model():
    return joblib.load(MODEL_DIR / "survival.pkl")


def phase_to_market_prob(phase_posterior: list[float], survival_covariates: pd.DataFrame, market_meta: dict) -> float | None:
    q = (market_meta.get("question") or "").lower()
    expiration = market_meta.get("expiration")
    expiration_ts = pd.to_datetime(expiration, utc=True, errors="coerce")
    if pd.isna(expiration_ts):
        return None
    days_to = max(1, int((expiration_ts.to_pydatetime() - datetime.now(UTC)).days))
    survival = _survival_model()
    p_kinetic = 1 - float(survival.predict_survival_function(survival_covariates, times=[days_to]).iloc[0].values[0])
    if "strikes iran" in q or "military action against iran" in q:
        return p_kinetic
    if "ceasefire" in q and "end" not in q:
        return (1 - p_kinetic) * 0.8
    if "strait of hormuz" in q and "closed" in q:
        return p_kinetic * 0.35
    if "regime" in q and "fall" in q:
        return p_kinetic * 0.15
    if "forces enter iran" in q or "invade" in q:
        return p_kinetic * 0.15
    if "nuclear deal" in q:
        return 1 - p_kinetic * 0.5
    return None


def compute_edge(model_prob: float, market_mid: float, spread: float, liquidity: float) -> dict:
    slippage = max(0.005, spread / 2 + 0.01 / max(liquidity / 1e6, 1))
    edge = model_prob - market_mid - slippage
    return {
        "model_prob": model_prob,
        "market_mid": market_mid,
        "edge": edge,
        "slippage": slippage,
        "tradeable": edge > 0.03,
    }


def edge_with_sizing(model_prob: float, market_mid: float, spread: float, liquidity: float) -> dict:
    result = compute_edge(model_prob, market_mid, spread, liquidity)
    result["size_recommended"] = kelly_size(
        result["edge"],
        market_mid,
        get_settings().bankroll_usd,
        liquidity,
    )
    return result
