"""Discrete-time hazard model for deadline contracts."""

from __future__ import annotations

from dataclasses import dataclass

from models.bayesian_model import logistic, logit


@dataclass(frozen=True)
class DeadlineHazardModel:
    weights: dict[str, float]
    intercept: float

    def hazard_probability(
        self,
        base_probability: float,
        days_to_deadline: int,
        features: dict[str, float],
    ) -> float:
        linear_term = self.intercept + self.weights.get("days_to_deadline", 0.0) * float(days_to_deadline)
        for feature_name, weight in self.weights.items():
            if feature_name == "days_to_deadline":
                continue
            linear_term += weight * float(features.get(feature_name, 0.0))
        return logistic(logit(base_probability) + linear_term)

    def probability_by_deadline(
        self,
        base_probability: float,
        horizon_days: int,
        features: dict[str, float],
    ) -> float:
        survival = 1.0
        for day in range(horizon_days, 0, -1):
            hazard = self.hazard_probability(base_probability, day, features)
            survival *= (1.0 - min(max(hazard, 1e-6), 1.0 - 1e-6))
        return 1.0 - survival


def fit_deadline_hazard_model(
    samples: list[dict[str, object]],
    learning_rate: float = 0.1,
    epochs: int = 500,
    l2_penalty: float = 0.01,
) -> DeadlineHazardModel:
    feature_names = sorted({"days_to_deadline", *samples[0]["features"].keys()})
    weights = {name: 0.0 for name in feature_names}
    intercept = 0.0

    for _ in range(epochs):
        grad_intercept = 0.0
        grad_weights = {name: 0.0 for name in feature_names}
        for sample in samples:
            base_probability = float(sample["base_probability"])
            days_to_deadline = int(sample["days_to_deadline"])
            outcome = int(sample["event_today"])
            features = sample["features"]
            linear_term = intercept + (weights["days_to_deadline"] * days_to_deadline)
            for feature_name in feature_names:
                if feature_name == "days_to_deadline":
                    continue
                linear_term += weights[feature_name] * float(features[feature_name])
            prediction = logistic(logit(base_probability) + linear_term)
            error = prediction - outcome
            grad_intercept += error
            grad_weights["days_to_deadline"] += error * days_to_deadline
            for feature_name in feature_names:
                if feature_name == "days_to_deadline":
                    continue
                grad_weights[feature_name] += error * float(features[feature_name])

        count = len(samples)
        intercept -= learning_rate * (grad_intercept / count)
        for feature_name in feature_names:
            weights[feature_name] -= learning_rate * (
                (grad_weights[feature_name] / count) + (l2_penalty * weights[feature_name])
            )

    return DeadlineHazardModel(weights=weights, intercept=intercept)
