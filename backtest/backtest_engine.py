"""Backtesting utilities for the quantitative prediction engine."""

from __future__ import annotations

from dataclasses import dataclass
from math import log
from statistics import fmean


def brier_score(predictions: list[float], outcomes: list[int]) -> float:
    if len(predictions) != len(outcomes) or not predictions:
        raise ValueError("predictions and outcomes must be non-empty and equal length")
    return fmean((prediction - outcome) ** 2 for prediction, outcome in zip(predictions, outcomes))


def log_loss(predictions: list[float], outcomes: list[int]) -> float:
    if len(predictions) != len(outcomes) or not predictions:
        raise ValueError("predictions and outcomes must be non-empty and equal length")
    clipped = [min(max(prediction, 1e-6), 1.0 - 1e-6) for prediction in predictions]
    losses = [
        -(outcome * log(prediction) + (1 - outcome) * log(1.0 - prediction))
        for prediction, outcome in zip(clipped, outcomes)
    ]
    return fmean(losses)


@dataclass(frozen=True)
class BacktestResult:
    model_brier: float
    market_brier: float
    model_log_loss: float
    market_log_loss: float
    brier_improvement: float
    log_loss_improvement: float


def evaluate_predictions(
    market_predictions: list[float],
    model_predictions: list[float],
    outcomes: list[int],
) -> BacktestResult:
    model_brier = brier_score(model_predictions, outcomes)
    market_brier = brier_score(market_predictions, outcomes)
    model_log = log_loss(model_predictions, outcomes)
    market_log = log_loss(market_predictions, outcomes)
    return BacktestResult(
        model_brier=model_brier,
        market_brier=market_brier,
        model_log_loss=model_log,
        market_log_loss=market_log,
        brier_improvement=market_brier - model_brier,
        log_loss_improvement=market_log - model_log,
    )
