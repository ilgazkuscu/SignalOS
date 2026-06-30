from __future__ import annotations

from lifelines import WeibullAFTFitter
import pandas as pd


class PhaseToKineticSurvival:
    def __init__(self) -> None:
        self.model = WeibullAFTFitter()

    def fit(self, df: pd.DataFrame) -> "PhaseToKineticSurvival":
        self.model.fit(df, duration_col="duration", event_col="event")
        return self

    def survival_at(self, days_ahead: int, covariates: pd.DataFrame) -> float:
        return float(self.model.predict_survival_function(covariates, times=[days_ahead]).iloc[0].values[0])

    def p_kinetic_within(self, days_ahead: int, covariates: pd.DataFrame) -> float:
        return 1 - self.survival_at(days_ahead, covariates)
