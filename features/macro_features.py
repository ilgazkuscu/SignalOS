"""Macro feature engineering for geopolitical prediction signals."""

from __future__ import annotations

from typing import Iterable


def _pct_change(old: float, new: float) -> float:
    if old == 0:
        return 0.0
    return (new - old) / abs(old)


def extract_macro_features(series: Iterable[dict[str, float]]) -> dict[str, float]:
    """
    Derive macro stress signals from recent time series snapshots.

    Expected fields:
    - oil_price
    - bond_yield
    - usd_index
    """

    points = list(series)
    if len(points) < 2:
        return {
            "oil_stress": 0.0,
            "rates_stress": 0.0,
            "usd_strength": 0.0,
            "macro_stress": 0.0,
        }

    first = points[0]
    latest = points[-1]
    oil_stress = _pct_change(first["oil_price"], latest["oil_price"])
    rates_stress = _pct_change(first["bond_yield"], latest["bond_yield"])
    usd_strength = _pct_change(first["usd_index"], latest["usd_index"])
    macro_stress = (abs(oil_stress) + abs(rates_stress) + abs(usd_strength)) / 3.0

    return {
        "oil_stress": oil_stress,
        "rates_stress": rates_stress,
        "usd_strength": usd_strength,
        "macro_stress": macro_stress,
    }
