"""News feature engineering for the quantitative prediction engine."""

from __future__ import annotations

from collections import Counter
from statistics import fmean
from typing import Iterable


POSITIVE_TERMS = {
    "ceasefire",
    "talks",
    "deal",
    "progress",
    "resume",
    "agreement",
    "stability",
    "cooperate",
    "diplomatic",
}

NEGATIVE_TERMS = {
    "strike",
    "attack",
    "sanction",
    "missile",
    "threat",
    "cancel",
    "delay",
    "escalate",
    "bomb",
    "conflict",
}

TOPIC_TERMS = {
    "war": {"war", "conflict", "strike", "missile", "troops", "bomb"},
    "trade": {"tariff", "trade", "export", "import", "sanction"},
    "diplomacy": {"talks", "ceasefire", "meeting", "summit", "agreement", "trip"},
    "energy": {"oil", "hormuz", "refiners", "energy", "shipping", "gas"},
}

ACTOR_TERMS = {
    "US": {"us", "u.s.", "america", "pentagon", "washington", "trump", "vance"},
    "China": {"china", "xi", "beijing", "chinese"},
    "Iran": {"iran", "tehran", "iranian"},
    "Israel": {"israel", "israeli"},
}


def _tokenize(text: str) -> list[str]:
    return [token.strip(".,:;!?()[]{}\"'").lower() for token in text.split() if token.strip()]


def classify_sentiment(text: str) -> float:
    """Return a bounded sentiment score in [-1, 1]."""

    tokens = _tokenize(text)
    if not tokens:
        return 0.0
    positive_hits = sum(token in POSITIVE_TERMS for token in tokens)
    negative_hits = sum(token in NEGATIVE_TERMS for token in tokens)
    raw_score = (positive_hits - negative_hits) / max(len(tokens), 1)
    return max(-1.0, min(1.0, raw_score * 4.0))


def classify_topic(text: str) -> str:
    """Return the dominant topic label for a news item."""

    tokens = set(_tokenize(text))
    topic_scores = {
        topic: len(tokens.intersection(terms))
        for topic, terms in TOPIC_TERMS.items()
    }
    best_topic = max(topic_scores, key=topic_scores.get)
    return best_topic if topic_scores[best_topic] > 0 else "general"


def classify_actor(text: str) -> str:
    """Return the dominant geopolitical actor."""

    tokens = set(_tokenize(text))
    actor_scores = {
        actor: len(tokens.intersection(terms))
        for actor, terms in ACTOR_TERMS.items()
    }
    best_actor = max(actor_scores, key=actor_scores.get)
    return best_actor if actor_scores[best_actor] > 0 else "unknown"


def extract_news_features(events: Iterable[dict[str, object]]) -> dict[str, float | str]:
    """
    Convert raw news events into aggregate numeric features.

    Expected event fields:
    - headline: str
    - summary: str
    - timestamp: int
    """

    materialized = list(events)
    if not materialized:
        return {
            "rolling_sentiment": 0.0,
            "shock_intensity": 0.0,
            "topic_concentration": 0.0,
            "dominant_topic": "general",
            "dominant_actor": "unknown",
            "event_count": 0.0,
        }

    sentiments: list[float] = []
    topic_counter: Counter[str] = Counter()
    actor_counter: Counter[str] = Counter()
    shock_count = 0

    for event in materialized:
        headline = str(event.get("headline", ""))
        summary = str(event.get("summary", ""))
        text = f"{headline} {summary}".strip()
        sentiment = classify_sentiment(text)
        topic = classify_topic(text)
        actor = classify_actor(text)
        sentiments.append(sentiment)
        topic_counter[topic] += 1
        actor_counter[actor] += 1
        if abs(sentiment) >= 0.2 or "breaking" in text.lower():
            shock_count += 1

    dominant_topic, dominant_topic_count = topic_counter.most_common(1)[0]
    dominant_actor, _ = actor_counter.most_common(1)[0]
    total = len(materialized)
    topic_concentration = dominant_topic_count / total

    return {
        "rolling_sentiment": max(0.0, min(1.0, (fmean(sentiments) + 1.0) / 2.0)),
        "shock_intensity": shock_count / total,
        "topic_concentration": topic_concentration,
        "dominant_topic": dominant_topic,
        "dominant_actor": dominant_actor,
        "event_count": float(total),
    }
