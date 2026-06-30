from __future__ import annotations

import joblib
from hmmlearn.hmm import GaussianHMM
import numpy as np
import pandas as pd


class PhaseHMM:
    def __init__(self, n_components: int = 6, covariance_type: str = "diag", n_iter: int = 200, random_state: int = 42):
        self.model = GaussianHMM(
            n_components=n_components,
            covariance_type=covariance_type,
            n_iter=n_iter,
            random_state=random_state,
            init_params="mc",
            params="stmc",
        )

    def _set_priors(self) -> None:
        self.model.transmat_ = np.array(
            [
                [0.95, 0.04, 0.005, 0.003, 0.001, 0.001],
                [0.30, 0.60, 0.08, 0.01, 0.005, 0.005],
                [0.10, 0.05, 0.70, 0.12, 0.02, 0.01],
                [0.05, 0.02, 0.03, 0.60, 0.20, 0.10],
                [0.02, 0.01, 0.02, 0.05, 0.40, 0.50],
                [0.80, 0.05, 0.05, 0.05, 0.03, 0.02],
            ]
        )
        self.model.startprob_ = np.array([0.95, 0.03, 0.015, 0.003, 0.001, 0.001])

    def fit(self, sequences: list[np.ndarray], lengths: list[int], features_labeled: pd.DataFrame | None = None) -> "PhaseHMM":
        if features_labeled is not None and not features_labeled.empty:
            feature_cols = [col for col in features_labeled.columns if col != "phase"]
            means = np.vstack(
                [
                    features_labeled[features_labeled.phase == phase][feature_cols].mean().fillna(0).to_numpy()
                    for phase in range(6)
                ]
            )
            covars = np.vstack(
                [
                    features_labeled[features_labeled.phase == phase][feature_cols].var().fillna(1e-3).to_numpy() + 1e-3
                    for phase in range(6)
                ]
            )
            self.model.means_ = means
            self.model.covars_ = covars
        self._set_priors()
        self.model.fit(np.vstack(sequences), lengths)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def viterbi(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict(X)

    def save(self, path: str) -> None:
        joblib.dump(self.model, path)

    def load(self, path: str) -> "PhaseHMM":
        self.model = joblib.load(path)
        return self
