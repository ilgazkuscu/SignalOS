from __future__ import annotations

import pandas as pd


BASE_WEIGHTS = {
    "tanker_sortie_z": 0.95,
    "b2_dg_ramp_count": 0.9,
    "ordered_departure_iraq": 0.9,
    "trump_two_weeks_pattern": 0.2,
    "senate_options_language": 0.5,
    "israeli_activity_spike": 0.8,
}

DECEPTION = {
    "trump_two_weeks_pattern": 0.7,
    "senate_options_language": 0.5,
    "tanker_sortie_z": 0.1,
    "b2_dg_ramp_count": 0.0,
    "ordered_departure_iraq": 0.0,
    "israeli_activity_spike": 0.2,
}


def score_row(row: pd.Series) -> float:
    total = 0.0
    for key, base in BASE_WEIGHTS.items():
        raw = abs(float(row.get(key, 0.0)))
        total += base * (1 - DECEPTION.get(key, 0.0)) * raw
    return total
