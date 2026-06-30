from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from signalos.backtest.ground_truth import build_labeled_operation_windows
from signalos.config import MODEL_DIR
from signalos.models.hmm import PhaseHMM
from signalos.models.survival import PhaseToKineticSurvival


FEATURE_COLUMNS = [
    "tanker_sortie_z",
    "b2_dg_ramp_count",
    "csg_centcom_count",
    "ordered_departure_iraq",
    "israeli_activity_spike",
    "trump_two_weeks_pattern",
    "signal_quality_score_composite",
]


def train_models() -> dict[str, Path]:
    labeled = build_labeled_operation_windows()
    labeled["signal_quality_score_composite"] = (
        labeled["tanker_sortie_z"] + labeled["b2_dg_ramp_count"] + labeled["ordered_departure_iraq"]
    )
    sequences = [group[FEATURE_COLUMNS].to_numpy(dtype=float) for _, group in labeled.groupby("operation")]
    lengths = [len(seq) for seq in sequences]
    hmm = PhaseHMM().fit(sequences, lengths, labeled[FEATURE_COLUMNS + ["phase"]])
    hmm_path = MODEL_DIR / "phase_hmm.pkl"
    hmm.save(str(hmm_path))

    survival_rows = []
    for operation, group in labeled.groupby("operation"):
        phase3_positions = group.index[group["phase"] >= 3].tolist()
        if not phase3_positions:
            continue
        start_idx = phase3_positions[0]
        for offset, (_, row) in enumerate(group.loc[start_idx:].iterrows(), start=1):
            survival_rows.append(
                {
                    "duration": offset,
                    "event": int(row["phase"] == 5),
                    "phase_posterior_3": float(row["phase"] >= 3),
                    "phase_posterior_4": float(row["phase"] >= 4),
                    "tanker_z": row["tanker_sortie_z"],
                    "b2_dg_ramp": row["b2_dg_ramp_count"],
                    "csg_centcom": row["csg_centcom_count"],
                    "composite_sqs": row["signal_quality_score_composite"],
                    "operation_type_strike": float(row["operation_type"] == "strike"),
                }
            )
    survival_df = pd.DataFrame(survival_rows)
    survival = PhaseToKineticSurvival().fit(survival_df)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    import joblib

    survival_path = MODEL_DIR / "survival.pkl"
    joblib.dump(survival.model, survival_path)
    return {"hmm": hmm_path, "survival": survival_path}
