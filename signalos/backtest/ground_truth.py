from __future__ import annotations

from datetime import timedelta

import pandas as pd

from signalos.config import HISTORICAL_OPERATIONS


PHASE_SCHEDULES = {
    "desert_storm": {90: 2, 45: 3, 15: 4, 0: 5},
    "desert_fox": {30: 2, 12: 3, 2: 4, 0: 5},
    "enduring_freedom": {30: 2, 14: 3, 7: 4, 0: 5},
    "iraqi_freedom": {90: 2, 45: 3, 15: 4, 0: 5},
    "odyssey_dawn": {20: 2, 6: 3, 2: 4, 0: 5},
    "syria_2017": {3: 3, 1: 4, 0: 5},
    "syria_2018": {7: 2, 4: 3, 1: 4, 0: 5},
    "soleimani": {2: 3, 1: 4, 0: 5},
    "midnight_hammer": {11: 2, 6: 3, 1: 4, 0: 5},
    "epic_fury": {14: 2, 7: 3, 2: 4, 0: 5},
}


def _phase_for_days(operation: str, days_to: int) -> int:
    phase = 0
    for threshold, threshold_phase in sorted(PHASE_SCHEDULES[operation].items(), reverse=True):
        if days_to <= threshold:
            phase = threshold_phase
    return phase


def build_labeled_operation_windows() -> pd.DataFrame:
    rows = []
    for op in HISTORICAL_OPERATIONS:
        d_day = pd.Timestamp(op["d_day"], tz="UTC")
        for days_to in range(90, -1, -1):
            phase = _phase_for_days(op["name"], days_to)
            rows.append(
                {
                    "operation": op["name"],
                    "operation_type": op["type"],
                    "date": d_day - timedelta(days=days_to),
                    "days_to_kinetic": days_to,
                    "phase": phase,
                    "tanker_sortie_z": max(0, (4 - min(days_to, 4))) if phase >= 3 else phase * 0.5,
                    "b2_dg_ramp_count": 4 if phase >= 3 else phase,
                    "csg_centcom_count": 2 if phase >= 3 else phase // 2,
                    "ordered_departure_iraq": int(phase >= 3),
                    "israeli_activity_spike": int(op["name"] in {"midnight_hammer", "epic_fury"} and phase >= 4),
                    "trump_two_weeks_pattern": int(op["name"] == "midnight_hammer" and phase >= 4),
                }
            )
    return pd.DataFrame(rows)
