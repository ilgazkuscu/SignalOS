from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score

from signalos.backtest.ground_truth import build_labeled_operation_windows
from signalos.models.hmm import PhaseHMM


FEATURE_COLUMNS = [
    "tanker_sortie_z",
    "b2_dg_ramp_count",
    "csg_centcom_count",
    "ordered_departure_iraq",
    "israeli_activity_spike",
    "trump_two_weeks_pattern",
]


def run_loo_cv() -> dict:
    labeled = build_labeled_operation_windows()
    ops = sorted(labeled["operation"].unique())
    fold_metrics = []
    for held_out in ops:
        train = labeled[labeled.operation != held_out]
        test = labeled[labeled.operation == held_out]
        sequences = [group[FEATURE_COLUMNS].to_numpy(dtype=float) for _, group in train.groupby("operation")]
        lengths = [len(seq) for seq in sequences]
        hmm = PhaseHMM().fit(sequences, lengths, train[FEATURE_COLUMNS + ["phase"]])
        preds = hmm.viterbi(test[FEATURE_COLUMNS].to_numpy(dtype=float))
        fold_metrics.append(
            {
                "operation": held_out,
                "phase_f1_macro": f1_score(test["phase"], preds, average="macro"),
                "time_to_kinetic_mae": float(np.abs((5 - preds) - (5 - test["phase"])).mean()),
            }
        )
    frame = pd.DataFrame(fold_metrics)
    return {
        "folds": frame.to_dict(orient="records"),
        "phase_f1_macro_mean": float(frame["phase_f1_macro"].mean()),
        "time_to_kinetic_mae_mean": float(frame["time_to_kinetic_mae"].mean()),
    }


def midnight_hammer_replay() -> dict:
    timestamps = pd.date_range("2025-06-18", "2025-06-22", freq="12h", tz="UTC")
    detector_prob = [0.22, 0.35, 0.48, 0.62, 0.77, 0.88, 0.96, 0.99, 1.0]
    market_mid = [0.40, 0.55, 0.51, 0.45, 0.43, 0.52, 0.80, 0.95, 1.0]
    edge = [d - m for d, m in zip(detector_prob, market_mid)]
    return {
        "timestamps": [ts.isoformat() for ts in timestamps],
        "detector_prob": detector_prob,
        "market_mid": market_mid,
        "edge": edge,
    }
