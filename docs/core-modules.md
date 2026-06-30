# Core Modules

## Intelligence

- `apps/web/src/lib/intelligence/event-clustering.ts`: clusters related source events, dedupes coverage links, computes cluster confidence/stage, builds executive summaries, and derives narrative trends.
- `apps/web/src/lib/intelligence/source-url.ts`: extracts canonical event URLs and domains for clustering and UI source links.
- `apps/web/src/lib/intelligence/briefing.ts`: converts the timeline intelligence payload into a shareable Elite Brief markdown memo.

## Timeline

- `apps/web/src/lib/timeline/live-news.ts`: fixture/live overlay orchestration, feed polling, article context hydration, live classification, catalyst-feed derivation, and fallback behavior.
- `apps/web/src/features/timeline/timeline-view.tsx`: executive brief, new-since-last-check state, watchlist focus, narrative tracker, source coverage, catalyst feed, and chronological event stream.

## Decision System

Decision modules live under `apps/web/src/lib/decision`, `apps/web/src/lib/edge`, `apps/web/src/lib/execution`, `apps/web/src/lib/portfolio`, `apps/web/src/lib/regime`, and `apps/web/src/lib/wording`. They remain separate from the presentation layer so formulas can be tested and explained.

- `lib/engine`: probabilistic belief updates
- `lib/decision`: trade decision and related analytics
- `lib/backtest`: fixture/simulated calibration
- `lib/edge`: EV ranking
- `lib/execution`: entry/exit/stale rules
- `lib/portfolio`: exposure and concentration
- `lib/timeline`: live news ingestion
- `lib/intelligence`: clustering and source evidence utilities
