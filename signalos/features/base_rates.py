from __future__ import annotations

import pandas as pd


def rolling_zscore(series: pd.Series, window: int) -> pd.Series:
    rolling_mean = series.rolling(window=window, min_periods=1).mean()
    rolling_std = series.rolling(window=window, min_periods=1).std().fillna(0)
    return ((series - rolling_mean) / rolling_std.replace(0, 1)).fillna(0.0)
