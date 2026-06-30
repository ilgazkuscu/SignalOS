# Architecture Decision Log

## What changed

- Added a reusable decision analytics layer under `apps/web/src/lib/decision`
- Kept business logic in service/modules, not in React components
- Expanded dashboard payload with decision outputs, thesis boxes, dislocation analytics, catalyst calendar, hit-rate metrics, and sizing guidance

## Why

The app needed to evolve from passive insight to actionable decision support while preserving traceability.

## What was deferred

- full order-book liquidity integration
- replay attribution by live catalyst
- calibration against realized trade outcomes

## Assumptions made

- current volume/spread data is sufficient for a first liquidity proxy
- fixture/live event structure is enough for catalyst-nearness estimation
- first-pass hit-rate tracking should be descriptive, not overfit

## Technical debt

- some dashboard cards still render directly from large payloads and could be broken into smaller feature components later
- catalyst calendar is useful but still partly inferred
