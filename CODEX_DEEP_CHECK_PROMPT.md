# Codex prompt — ProjectZero cleanup pass (2026-04-16)

Paste the block below into Codex. The "Context" section summarizes what was found during a static deep-check; the "Tasks" section is the ordered work list. Do not start until you've read every referenced file.

---

You are working in the ProjectZero repo. Before writing any code, read the files referenced below so your edits match the current state. Typecheck is clean and lint has one pre-existing warning. Tests were not run in the review environment (sandbox arch mismatch); you must run `npm run maint:check` locally after each task before marking it done.

## Context — what the review found

The snapshots feature and the family engine hook were added together, and their duplication is the dominant source of risk right now. Tracking docs (`STATUS.md`, `NEXT_STEP.md`, `PLAN.md`) have not been updated since 2026-04-11 and no longer reflect the current code. Everything below is cross-referenced to line numbers as of commit state at 2026-04-16T06:13Z.

### Problem 1 — duplicated snapshot preloading

`apps/web/src/app/snapshots/page.tsx` lines 13–40 and `apps/web/src/app/api/snapshots/route.ts` lines 13–47 contain the same constants (`HORMUZ_EVENT_SLUG`, `HORMUZ_LABEL_ORDER`) and the same four-step preload (`getDashboard` + `getReplayPayload` + `fetchPolymarketHistory` for apr-15 + `fetchPolymarketEventMarkets` + per-market `fetchPolymarketHistoryForEventMarket`). Any change to the ordered Hormuz labels or event slug must be made in two places.

### Problem 2 — duplicated Hormuz model derivation

`deriveHormuzModelByDate`, `HORMUZ_MODEL_ADJUSTMENTS`, and the ordered Hormuz labels live in both:

- `apps/web/src/features/snapshots/market-snapshots-view.tsx` (constant named `HORMUZ_LABEL_ORDER`, helper at lines 78–95)
- `apps/web/src/hooks/use-family-engine-output.ts` (constant named `HORMUZ_BUCKET_ORDER`, helper at lines 70–90)

The constant names have already diverged. The helper bodies are byte-identical. Consumer sites: `features/snapshots/market-snapshots-view.tsx` lines 213 and 254; `hooks/use-family-engine-output.ts` lines 327, 351, 428.

### Problem 3 — variable shadowing in `evaluateModelAt`

`apps/web/src/hooks/use-family-engine-output.ts` line 425 declares `const signals = signalIdsInScope…` inside `buildHormuzOutput.replaySeries.evaluateModelAt`, shadowing the outer `const signals = buildSignalRows(…)` declared at line 372. The inner value is later passed back into `buildSignalRows` via `{ ...payload, signals: { ...payload.signals, signals } }` at line 452, which is correct but extremely easy to misread.

### Problem 4 — cross-family contract keys fed into Hormuz model

`apps/web/src/hooks/use-family-engine-output.ts` lines 429–437: `payload.dashboard.markets.map((market) => [market.id, …])` feeds Iran contract ids (`apr-15`, `apr-21`, `apr-30`, `may-31`, `jun-30`) into `deriveHormuzModelByDate`, which anchors on `apr-15`/`apr-21`. It works today only because the Iran family happens to use those contract ids. This couples the Hormuz family's replay series to the Iran contract layout. Move the contract-key list onto the `MarketFamily` definition (e.g. `iranOpsEndgameFamily.hormuzAnchorContractIds`) or derive it from `payload.dashboard.discrepancy` explicitly.

### Problem 5 — silent-empty Hormuz replay when Polymarket fetch fails

`buildHormuzReplay` in `apps/web/src/hooks/use-family-engine-output.ts` lines 319–343 iterates `payload.snapshots.liveHormuzHistoryByLabel[bucketId]`. Both snapshot loaders (`app/snapshots/page.tsx:37` and `app/api/snapshots/route.ts:36`) `.catch(() => [])` on fetch failure. When Polymarket is unreachable, replay is silently `[]` and the UI shows only the generic `emptyStates.replay` string "No replay history available for this family yet." Surface a distinct state for "live fetch failed vs. no data" so operators can tell apart an outage from an uncovered family.

### Problem 6 — tracking docs are stale

`STATUS.md`, `NEXT_STEP.md`, and `PLAN.md` were last touched on 2026-04-11. Since then, Codex has added the `snapshots/` page + API route, the `use-family-engine-output` hook, the `engine/replay-series.ts` frame-based replay, the `engine/families/` split (iran-ops-endgame, hormuz-closure), and a polymarket fetcher/service rewrite — none of which are recorded. The `NEXT_STEP.md` action item ("Add a lightweight route or UI smoke test for the dashboard live-ingestion panel and `/api/timeline/health`") is already satisfied: `apps/web/src/app/api/timeline/health/route.ts` and `tests/integration/routes.test.ts` both exist.

### Problem 7 — fragile dashboard integration test

`tests/integration/routes.test.ts:28-32` calls `renderToStaticMarkup(DashboardPage)`. `DashboardPage` returns `<DashboardWorkspace />`, a `"use client"` component that calls `useFamilyEngineOutput`, which fires five `fetch("/api/…")` calls inside a `useEffect` and starts a `window.setInterval`. Static markup rendering does not execute effects, so it passes today. Any future refactor that moves data loading out of `useEffect` into render will break this test. Either mock the hook at the module boundary, or convert the test to a `@testing-library/react` render with `jsdom` and assert on an idle state.

### Problem 8 — double polling of `/api/snapshots`

`apps/web/src/features/snapshots/market-snapshots-view.tsx` lines 161–187 polls `/api/snapshots` every `NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS`. `apps/web/src/hooks/use-family-engine-output.ts` lines 525–532 polls the same route on the same interval as part of its five-route fan-out. When both the dashboard workspace and the snapshots page are mounted (e.g. a user navigating between them in the same tab), the snapshots route gets hit twice per tick. Consolidate on a single source of truth — either promote the snapshots fetch into a shared query module with request de-duplication, or have `MarketSnapshotsView` subscribe to the hook's payload rather than polling on its own.

### Problem 9 — pre-existing lint warning

`apps/web/src/components/source-badge.tsx:37` — `@next/next/no-img-element`. Replace with `next/image` or document the intentional override.

## Tasks (do in order; run `npm run maint:check` after each)

1. Extract `loadSnapshotsPayload()` into a new `apps/web/src/lib/snapshots/loader.ts`. Move the shared constants (`HORMUZ_EVENT_SLUG`, `HORMUZ_LABEL_ORDER`) and the four-step preload used by `app/snapshots/page.tsx` and `app/api/snapshots/route.ts` into it. Both call-sites shrink to one `await loadSnapshotsPayload()`.

2. Extract `deriveHormuzModelByDate`, `HORMUZ_MODEL_ADJUSTMENTS`, and the ordered labels into a new `apps/web/src/engine/families/hormuz-model.ts` and re-export them from `features/snapshots/market-snapshots-view.tsx` and `hooks/use-family-engine-output.ts`. Delete the duplicates. Keep one canonical constant name (`HORMUZ_BUCKET_ORDER`).

3. In `hooks/use-family-engine-output.ts` around line 425, rename the inner `signals` local inside `evaluateModelAt` to `scopedSignals`. Update the spread on line 452 accordingly.

4. Make the Iran anchor contracts explicit for Hormuz. Add `hormuzAnchorContractIds: MarketId[]` to the `iranOpsEndgameFamily` definition in `apps/web/src/engine/families/iran-ops-endgame.ts`, and change `hooks/use-family-engine-output.ts` lines 429–437 to iterate that list rather than `payload.dashboard.markets`.

5. Add a discriminated `liveHormuzHistoryStatus` field to the snapshots payload (`"ok" | "fetch_failed" | "no_data"`). Propagate it through `SnapshotPayload` in `use-family-engine-output.ts` and render a distinct empty state in `MarketSnapshotsView` and in the Hormuz `emptyStates.replay` string (see `use-family-engine-output.ts` lines 468–474).

6. Deduplicate polling. Delete the `setInterval` block in `market-snapshots-view.tsx:161-187` and have the snapshots page subscribe to the shared hook payload instead. If the standalone `/snapshots` route is still needed as a server-rendered page, add a client-side provider that mounts the same `useFamilyEngineOutput` polling loop once per tab.

7. Update tracking docs:
   - `NEXT_STEP.md` — replace with a new first-next action derived from items 1–6 above.
   - `STATUS.md` — append entries for each change landed after 2026-04-11.
   - `PLAN.md` — add the current snapshot/family-engine cleanup as step 4 with status `in_progress`.

8. Harden `tests/integration/routes.test.ts`. Either `vi.mock("@/hooks/use-family-engine-output")` with a stub that returns a deterministic payload, or move the dashboard render to a `@testing-library/react` test that awaits the loading-to-loaded transition. Keep the existing page-sanity asserts.

9. Fix `apps/web/src/components/source-badge.tsx:37` — switch to `next/image`. If a third-party favicon URL makes that impractical, add a scoped `eslint-disable-next-line @next/next/no-img-element` with a one-line justification.

## Definition of done

- `npm run maint:check` passes cleanly after each task.
- No file contains `HORMUZ_EVENT_SLUG`, `HORMUZ_LABEL_ORDER`, `HORMUZ_BUCKET_ORDER`, `HORMUZ_MODEL_ADJUSTMENTS`, or `deriveHormuzModelByDate` more than once.
- `grep -r "const signals = signalIdsInScope" apps/web/src` returns nothing.
- `STATUS.md` has an entry dated 2026-04-16 per task landed.
- The snapshots route is fetched at most once per poll tick when both `/dashboard` and `/snapshots` are open.
