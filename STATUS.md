# ProjectZero Maintenance Status

## 2026-04-11 - Step 1
- What changed: Taught the long-running polling loop to compute its sleep from persisted due-source state and log the next scheduled wake-up instead of always sleeping a fixed interval.
- Files touched: `apps/web/src/lib/news/scheduler.ts`, `scripts/poll-news-loop.ts`, `tests/unit/scheduler.test.ts`
- Validation run: `npm test -- --run tests/unit/scheduler.test.ts`
- Result: Passed.
- Risks or blockers: Unchecked sources are intentionally treated as immediately due, so first-run behavior will still fan out across the configured source list.

## 2026-04-11 - Step 2
- What changed: Surfaced live-ingestion health directly in the dashboard payload and UI, including healthy/failing counts, due-now count, stored updates, last model refresh, and failing/stale source notes.
- Files touched: `apps/web/src/lib/types/domain.ts`, `apps/web/src/lib/api/service.ts`, `apps/web/src/features/dashboard/dashboard-view.tsx`
- Validation run: `npm run typecheck && npm run lint`
- Result: Passed after aligning one status-pill tone with the supported component API.
- Risks or blockers: The dashboard currently shows a compact status slice, not a full source table.

## 2026-04-11 - Step 3
- What changed: Added integration assertions so the dashboard service contract now proves health summary and source coverage are present.
- Files touched: `tests/integration/api.test.ts`
- Validation run: `npm test -- --run tests/unit/scheduler.test.ts tests/integration/api.test.ts`
- Result: Passed.
- Risks or blockers: The targeted suite hits live-intel code paths and can still reflect upstream feed volatility, although it passed in this run.
