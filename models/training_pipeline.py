"""Training utilities for fitted Bayesian, calibration, and regime parameters."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from models.bayesian_model import BayesianLogitModel, logistic, logit


@dataclass(frozen=True)
class PlattCalibrator:
    a: float
    b: float

    def calibrate(self, probability: float) -> float:
        return logistic((self.a * logit(probability)) + self.b)


@dataclass(frozen=True)
class RegimeTransitionModel:
    transition_matrix: dict[str, dict[str, float]]


@dataclass(frozen=True)
class TrainingArtifacts:
    bayesian_model: BayesianLogitModel
    calibrator: PlattCalibrator
    regime_model: RegimeTransitionModel
    feature_names: list[str]
    training_loss: float


def _binary_log_loss(probabilities: list[float], outcomes: list[int]) -> float:
    clipped = [min(max(probability, 1e-6), 1.0 - 1e-6) for probability in probabilities]
    total = 0.0
    for probability, outcome in zip(clipped, outcomes):
        total += -(outcome * logit(probability) - (0.0 if outcome else logit(1.0 - probability)))
    return total / len(outcomes)


def load_sample_training_data(path: str | Path) -> dict[str, object]:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def fit_bayesian_logit(
    samples: list[dict[str, object]],
    learning_rate: float = 0.25,
    epochs: int = 600,
    l2_penalty: float = 0.02,
) -> tuple[BayesianLogitModel, list[str], float]:
    feature_names = sorted(samples[0]["features"].keys())
    weights = {name: 0.0 for name in feature_names}
    intercept = 0.0

    for _ in range(epochs):
        grad_intercept = 0.0
        grad_weights = {name: 0.0 for name in feature_names}
        for sample in samples:
            market_prior = float(sample["market_prob"])
            outcome = int(sample["outcome"])
            features = sample["features"]
            linear_term = intercept
            for feature_name in feature_names:
                linear_term += weights[feature_name] * float(features[feature_name])
            prediction = logistic(logit(market_prior) + linear_term)
            error = prediction - outcome
            grad_intercept += error
            for feature_name in feature_names:
                grad_weights[feature_name] += error * float(features[feature_name])

        sample_count = len(samples)
        intercept -= learning_rate * (grad_intercept / sample_count)
        for feature_name in feature_names:
            weights[feature_name] -= learning_rate * (
                (grad_weights[feature_name] / sample_count) + (l2_penalty * weights[feature_name])
            )

    model = BayesianLogitModel(weights=weights, intercept=intercept)
    predictions = [
        model.predict(float(sample["market_prob"]), sample["features"]).posterior
        for sample in samples
    ]
    losses = []
    for prediction, sample in zip(predictions, samples):
        outcome = int(sample["outcome"])
        clipped = min(max(prediction, 1e-6), 1.0 - 1e-6)
        losses.append(-(outcome * __import__("math").log(clipped) + (1 - outcome) * __import__("math").log(1.0 - clipped)))
    return model, feature_names, sum(losses) / len(losses)


def fit_platt_scaler(
    raw_probabilities: list[float],
    outcomes: list[int],
    learning_rate: float = 0.1,
    epochs: int = 400,
) -> PlattCalibrator:
    a = 1.0
    b = 0.0
    logits = [logit(probability) for probability in raw_probabilities]
    for _ in range(epochs):
        grad_a = 0.0
        grad_b = 0.0
        for raw_logit, outcome in zip(logits, outcomes):
            prediction = logistic((a * raw_logit) + b)
            error = prediction - outcome
            grad_a += error * raw_logit
            grad_b += error
        count = len(outcomes)
        a -= learning_rate * (grad_a / count)
        b -= learning_rate * (grad_b / count)
    return PlattCalibrator(a=a, b=b)


def fit_regime_transition_model(
    sequences: list[list[str]],
    smoothing: float = 1.0,
) -> RegimeTransitionModel:
    regimes = sorted({state for sequence in sequences for state in sequence})
    counts = {
        source: {target: smoothing for target in regimes}
        for source in regimes
    }
    for sequence in sequences:
        for index in range(1, len(sequence)):
            counts[sequence[index - 1]][sequence[index]] += 1.0
    matrix = {}
    for source in regimes:
        row_total = sum(counts[source].values())
        matrix[source] = {
            target: counts[source][target] / row_total
            for target in regimes
        }
    return RegimeTransitionModel(transition_matrix=matrix)


def train_from_dataset(path: str | Path) -> TrainingArtifacts:
    dataset = load_sample_training_data(path)
    bayesian_samples = dataset["bayesian_samples"]
    bayesian_model, feature_names, training_loss = fit_bayesian_logit(bayesian_samples)
    raw_probabilities = [
        bayesian_model.predict(float(sample["market_prob"]), sample["features"]).posterior
        for sample in bayesian_samples
    ]
    outcomes = [int(sample["outcome"]) for sample in bayesian_samples]
    calibrator = fit_platt_scaler(raw_probabilities, outcomes)
    regime_model = fit_regime_transition_model(dataset["regime_sequences"])
    return TrainingArtifacts(
        bayesian_model=bayesian_model,
        calibrator=calibrator,
        regime_model=regime_model,
        feature_names=feature_names,
        training_loss=training_loss,
    )
