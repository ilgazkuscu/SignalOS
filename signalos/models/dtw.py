from __future__ import annotations

from dtaidistance import dtw
import numpy as np
import pandas as pd


def match_template(current: np.ndarray, templates: dict[str, np.ndarray]) -> tuple[str, float]:
    scores = {name: dtw.distance_fast(current, series) for name, series in templates.items()}
    best = min(scores, key=scores.get)
    return best, float(scores[best])


def template_dict(df: pd.DataFrame, value_column: str = "phase") -> dict[str, np.ndarray]:
    return {
        name: group[value_column].to_numpy(dtype=float)
        for name, group in df.groupby("operation")
    }
