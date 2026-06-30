# Data Flow

## Live Timeline Intelligence Flow

1. RSS/source feeds and fixture events enter `getLiveTimelineOverlay`.
2. Events are classified for relevance and impact path.
3. `clusterSourceEvents` groups related items and deduplicates source coverage links.
4. Clusters receive an inspectable confidence score based on source count, cross-source agreement, relevance, and novelty.
5. `buildNewsSummary` turns the highest-ranked clusters into the Executive Brief.
6. `buildNarrativeTrends` groups clusters by narrative category so the UI can show whether a narrative is forming, accelerating, or confirmed.
7. The Timeline page renders Executive Brief, New Since Last Check, Narrative Tracker, Source Coverage, Catalyst Feed, and chronology from the same payload.
8. `/api/timeline/brief` reuses the same payload to generate a shareable markdown memo, avoiding a second inconsistent summary pipeline.

This keeps the investor-facing story consistent: summaries, source coverage, and narrative tracking are not separate hand-written surfaces.

## Dashboard
`DemoRepository/live adapters` -> market data resolver -> belief engine -> decision/edge/backtest modules -> DashboardView.

## Timeline
RSS/live fixtures -> article context -> live classifier -> event clustering -> news summary and source coverage.

## Signals
Signals -> candidate impact engine -> grouped Signal Explorer UI.
