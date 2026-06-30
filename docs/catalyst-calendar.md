# Catalyst Calendar

## Event schema

- `id`
- `title`
- `startAt`
- `eventType`
- `confidence`
- `relevance`
- `linkedMarkets`
- `note`
- `sourceLabel`
- `fixtureBacked`

## Source types

- press briefings
- speeches
- diplomatic meetings
- market deadlines
- inferred weekend / thin-liquidity windows

## Confidence levels

- `confirmed`
- `inferred`

## Linkage to markets

Each event links to one or more market buckets so the decision layer can estimate catalyst nearness.

## UI behavior

- confirmed vs inferred badges
- relevance labels
- snapshot-only / fixture-backed badge where applicable

## Limitation

The current calendar mixes structured fixture events with inferred windows. It is useful, but not a full live macro calendar.
