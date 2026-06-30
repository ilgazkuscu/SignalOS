# Source Adapter Guide

Each adapter should implement the `SourceAdapter` interface:

- `fetchRecords()`
- `normalize(records)`
- `run()`

## Output Contract

Adapters normalize into:

- `SourceEvent[]`
- `Signal[]`

## Current Adapters

- `truth_social_adapter`
- `white_house_statements_adapter`
- `dod_statements_adapter`
- `market_adapter`
- `flights_adapter`
- `diplomatic_events_adapter`
- `manual_signal_adapter`
- `overflight_normalization_adapter`
- `pizza_index_adapter`

## Fixture Mode

Current local development uses fixture-backed adapters for reproducibility. Each adapter is already isolated behind an interface so live APIs can be added later without rewriting engine code.

The repository layer is selected through `getRepository()`:

- fixture-backed `DemoRepository`
- placeholder `PrismaRepository`

## Live Integration Notes

- preserve raw payloads
- assign stable external ids
- dedupe at adapter level before signal generation
- annotate extraction method and confidence source
- separate candidate vs verified signals
- keep fixture-mode behavior working when adding live adapters
