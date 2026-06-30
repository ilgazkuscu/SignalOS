from __future__ import annotations

import pandas as pd


def compute_p3_trigger(row: pd.Series) -> int:
    score = int(row["csg_centcom_count"] >= 2)
    score += int(row["b2_dg_ramp_count"] >= 4)
    score += int(row["ordered_departure_iraq"] == 1)
    score += int(row["tanker_sortie_z"] > 2)
    score += int(row.get("msc_mpsron_sortie", 0) == 1)
    return int(score >= 2)


def compute_p4_trigger(row: pd.Series) -> int:
    departure_delta = row.get("b2_dg_ramp_count_delta_48h", 0.0) < 0
    tanker_bridge = bool(row.get("tanker_bridge_active", 0))
    return int(
        compute_p3_trigger(row)
        and (
            row["israeli_activity_spike"] == 1
            or (departure_delta and tanker_bridge)
            or row["senate_options_language"] == 1
            or row["trump_two_weeks_pattern"] == 1
        )
    )
