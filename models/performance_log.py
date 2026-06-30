"""Per-observation model-vs-market evaluation logging."""

from __future__ import annotations

from dataclasses import dataclass
from math import log


@dataclass(frozen=True)
class ComparisonLogEntry:
    index: int
    market_probability: float
    model_probability: float
    outcome: int
    market_abs_error: float
    model_abs_error: float
    market_log_loss: float
    model_log_loss: float
    winner: str


def _clip_probability(value: float) -> float:
    return min(max(value, 1e-6), 1.0 - 1e-6)


def _binary_log_loss(probability: float, outcome: int) -> float:
    probability = _clip_probability(probability)
    return -(outcome * log(probability) + (1 - outcome) * log(1.0 - probability))


def build_performance_log(
    market_predictions: list[float],
    model_predictions: list[float],
    outcomes: list[int],
) -> list[ComparisonLogEntry]:
    entries: list[ComparisonLogEntry] = []
    for index, (market_probability, model_probability, outcome) in enumerate(
        zip(market_predictions, model_predictions, outcomes),
        start=1,
    ):
        market_abs_error = abs(market_probability - outcome)
        model_abs_error = abs(model_probability - outcome)
        market_log_loss = _binary_log_loss(market_probability, outcome)
        model_log_loss = _binary_log_loss(model_probability, outcome)
        if model_log_loss < market_log_loss and model_abs_error <= market_abs_error:
            winner = "model"
        elif market_log_loss < model_log_loss and market_abs_error <= model_abs_error:
            winner = "market"
        else:
            winner = "mixed"
        entries.append(
            ComparisonLogEntry(
                index=index,
                market_probability=market_probability,
                model_probability=model_probability,
                outcome=outcome,
                market_abs_error=market_abs_error,
                model_abs_error=model_abs_error,
                market_log_loss=market_log_loss,
                model_log_loss=model_log_loss,
                winner=winner,
            )
        )
    return entries


def summarize_performance_log(entries: list[ComparisonLogEntry]) -> dict[str, object]:
    model_wins = [entry for entry in entries if entry.winner == "model"]
    market_wins = [entry for entry in entries if entry.winner == "market"]
    mixed = [entry for entry in entries if entry.winner == "mixed"]
    return {
        "model_wins": len(model_wins),
        "market_wins": len(market_wins),
        "mixed": len(mixed),
        "model_win_indices": [entry.index for entry in model_wins],
        "market_win_indices": [entry.index for entry in market_wins],
    }
