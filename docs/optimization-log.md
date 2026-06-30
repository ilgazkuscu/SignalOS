# Optimization Log

## 2026-04-10

- Added `scripts/benchmark.ts` to measure the two current high-growth transform paths: source-event clustering and decision-pipeline derivation.
- Added `npm run benchmark` and included it in `make validate`.
- Centralized source URL/domain extraction in `apps/web/src/lib/intelligence/source-url.ts` so clustering and Signal Explorer do not maintain separate URL parsing helpers.

## Deferred

- No render-level memoization was added because fixture-scale measurements do not justify the extra complexity yet.
- No API caching boundary changes were made because live Polymarket/timeline behavior is intentionally dynamic and fallback-safe.

## This pass
- Added `scripts/benchmark.ts` for repeatable measurement.
- Centralized source URL parsing to reduce duplicate logic and accidental object churn.

## Not done
- No micro-optimization of React sections because product impact is low at current dataset size.
- No caching rewrite because live source freshness is more important right now.
