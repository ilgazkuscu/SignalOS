"""Tiny standalone version of the Iran Ops model.

Run:
    python3 scripts/simple_model.py

This is intentionally not the full app. It is a readable scratchpad for the
core idea: real de-escalation and qualifying announcement are different states.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def cumulative_probability(prior: float, daily_hazard: float, days: int) -> float:
    """Probability an event happens by day N with a constant daily hazard."""
    return clamp(prior + (1 - prior) * (1 - math.exp(-daily_hazard * days)))


@dataclass(frozen=True)
class Signal:
    name: str
    real_end_push: float
    announcement_push: float
    friction_push: float
    confidence: float


def apply_signals(signals: list[Signal]) -> tuple[float, float, float]:
    base_real_hazard = 0.012
    base_announcement_hazard = 0.007
    base_friction = 0.32

    real_hazard = base_real_hazard + sum(signal.real_end_push * signal.confidence for signal in signals)
    announcement_hazard = base_announcement_hazard + sum(
        signal.announcement_push * signal.confidence for signal in signals
    )
    friction = base_friction + sum(signal.friction_push * signal.confidence for signal in signals)

    return clamp(real_hazard, high=0.15), clamp(announcement_hazard, high=0.15), clamp(friction)


def yes_probability(days: int, signals: list[Signal]) -> dict[str, float]:
    real_hazard, announcement_hazard, friction = apply_signals(signals)
    real_end = cumulative_probability(prior=0.08, daily_hazard=real_hazard, days=days)
    announcement_given_end = cumulative_probability(prior=0.05, daily_hazard=announcement_hazard, days=days)
    yes = real_end * announcement_given_end * (1 - friction)

    return {
        "real_end": real_end,
        "announce_given_end": announcement_given_end,
        "friction": friction,
        "yes": yes,
    }


def print_row(label: str, days: int, signals: list[Signal]) -> None:
    result = yes_probability(days, signals)
    print(
        f"{label:8} | days={days:2d} | "
        f"real_end={result['real_end']:.1%} | "
        f"announce|end={result['announce_given_end']:.1%} | "
        f"friction={result['friction']:.2f} | "
        f"YES={result['yes']:.1%}"
    )


if __name__ == "__main__":
    signals = [
        Signal("tanker bridge fading", real_end_push=0.010, announcement_push=0.001, friction_push=0.00, confidence=0.75),
        Signal("Oman talks", real_end_push=0.006, announcement_push=0.004, friction_push=-0.02, confidence=0.65),
        Signal("pause language only", real_end_push=0.002, announcement_push=0.001, friction_push=0.07, confidence=0.80),
    ]

    print("Toy model: why early buckets can be lower than market if wording is weak")
    for label, days in [("Apr 15", 4), ("Apr 21", 10), ("Apr 30", 19), ("May 31", 50), ("Jun 30", 80)]:
        print_row(label, days, signals)

    print("\nNow add an explicit official end-language signal:")
    official_end = Signal(
        "official operations concluded",
        real_end_push=0.015,
        announcement_push=0.035,
        friction_push=-0.25,
        confidence=0.95,
    )
    for label, days in [("Apr 15", 4), ("Apr 21", 10), ("Apr 30", 19), ("May 31", 50), ("Jun 30", 80)]:
        print_row(label, days, [*signals, official_end])
