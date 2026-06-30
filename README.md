# IRAN OPS ENDGAME ENGINE

Analyst-grade web application for estimating whether a resolution-sensitive geopolitical prediction market resolves `YES` by each listed date bucket.

## What It Does

The system is built around one core distinction:

- `Reality`: are U.S. military operations against Iran actually winding down?
- `Resolution`: is there likely to be a qualifying public statement that satisfies market rules?

The engine combines:

- date-based prior curves
- structured signal ingestion
- family-weighted evidence updates
- contradiction and correlation penalties
- resolution-friction modeling
- market-vs-model discrepancy analysis
- scenario simulation
- deterministic replay/backtest
- temporal replay series that preserve active vs. closed bucket state with no future signal leakage

Replay series are frame-based rather than a flat overlay: each frame records every family bucket as `not_yet_issued`, `active`, or `closed`, computes aggregates from active buckets only, and only includes signals that had actually occurred by that timestamp. That keeps historical replay honest: a signal from April 10 cannot influence an April 5 frame, and an expired bucket like April 15 remains available for history without contaminating the live ladder after it closes.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma schema targeting PostgreSQL
- fixture-backed adapters for fully offline development
- live market and live timeline overlays with fallback-to-fixture behavior
- Vitest for unit and integration testing

## Repo Layout

```text
apps/web/src/app
apps/web/src/components
apps/web/src/features
apps/web/src/lib/api
apps/web/src/lib/adapters
apps/web/src/lib/classifiers
apps/web/src/lib/db
apps/web/src/lib/engine
apps/web/src/lib/types
fixtures
prisma
tests
docs
md
```

## Local Setup

1. Install Node 20+ and npm.
2. Copy `.env.example` to `.env`.
3. Run the one-command startup flow with `./run.sh`.

If you prefer the manual path:

1. Install dependencies with `npm install`.
2. Generate Prisma client with `npm run db:generate`.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run the app with `npm run dev`.

You can also use `make run`.

The current implementation is fixture-first and works without live APIs. PostgreSQL is modeled in Prisma for future persistence, but the default demo uses in-memory fixture data through `DemoRepository`.

## Verified Commands

The following commands have been validated locally in this repo:

- `npm install`
- `npm run db:generate`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run dev`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run benchmark`
- `npm run news:poll`
- `npm run news:loop`
- `npm run maint:check`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:migrate`
- `npm run seed`

Use `make validate` when you want the full local confidence pass: lint, typecheck, tests, production build, and the lightweight transform benchmark.

## Key Pages

- `/` redirects to the selector-driven dashboard workspace
- `/dashboard?family=iran-ops-endgame` selector-driven workspace
- `/signals` signal explorer
- `/timeline` event timeline
- `/scenario-lab` scenario simulator
- `/model` model explainer
- `/replay` deterministic replay
- `/rules` resolution rules inspector
- `/admin` weight profile viewer

The dashboard now includes:

- trade / watch / no-trade classification
- thesis-change boxes per bucket
- cross-bucket dislocation analytics
- catalyst calendar
- signal hit-rate tracking
- position sizing guidance

## How The Dropdown Drives The App

- The active bet is controlled by the `family` query param, for example `/dashboard?family=iran-ops-endgame` or `/dashboard?family=hormuz-closure`.
- The persistent bet selector in the header is the single source of truth for the workspace.
- Dashboard, Signals, News, Playbook, and Replay all render from the selected family plus the computed family engine output.
- Switching bets updates the URL instead of doing a full page reload, so links are shareable and survive refresh.

## Live Intelligence Layer

- Live market prices update from Polymarket while signals can still run in fixture-backed mode.
- The timeline ingests major news and strategic-analysis feeds, follows a limited number of article links, and classifies enriched article context.
- The dashboard surfaces thresholded alerts, catalyst-aware live news, and ranked opportunities instead of only raw model-market gaps.
- The live intel layer now supports one-shot polling, a local loop runner, conditional fetch checks, persisted source state, and source health inspection at `/api/timeline/health`.
- Additional product notes live in [`md/LIVE_INTELLIGENCE_LAYER.md`](md/LIVE_INTELLIGENCE_LAYER.md) and [`md/COMMERCIALIZATION_NOTES.md`](md/COMMERCIALIZATION_NOTES.md).
- Decision-system documentation lives in the `docs/` folder, including trade scoring, thesis generation, dislocation math, catalyst calendar, hit-rate tracking, and sizing guidance.

## Operating The Live Layer

- Run one cycle with `npm run news:poll`
- Run a local polling loop with `npm run news:loop`
- Inspect source health at `GET /api/timeline/health`
- Run the maintenance confidence pass with `npm run maint:check`

Local persistent polling state lives in `.projectzero/live-intel-store.json`.

## API Surface

- `GET /api/dashboard`
- `GET /api/markets`
- `GET /api/belief/current`
- `GET /api/belief/history`
- `GET /api/signals`
- `POST /api/signals/manual`
- `GET /api/scenarios`
- `POST /api/scenarios/run`
- `GET /api/replay`
- `POST /api/admin/weights`
- `POST /api/admin/recompute`
- `GET /api/rules`
- `POST /api/statements/classify`

## Modeling Notes

- Official explicit wording outranks vibes.
- Force-posture drawdowns support `real_end` more than `formal_announcement`.
- Pizza index and similar proxies are intentionally low-confidence.
- Market prices are used as a light input, not the target.
- Resolution friction explicitly discounts cases where de-escalation happens without a qualifying statement.
- Candidate-signal projected impact is computed by promoting one candidate at a time through the same engine path and comparing the result to the verified baseline.
- Replay uses fixture-backed historical market series rather than repeating a single snapshot.

## Tested Coverage

- statement classifier behavior
- belief engine behavior
- route-level render sanity for dashboard, signals, timeline, scenario lab, model, replay, rules, and admin
- API service behavior for dashboard, replay, signal explorer, classifier, and scenarios
- deterministic replay ordering and scenario-time evaluation
- Signal Explorer degraded/failure state behavior

## Repo Tracking

The repo now uses:

- `PRD.md` for product intent and verified state
- `ISSUES.md` for the current task queue
- `WORKLOG.md` for validated task history

## Fixture Scenarios

- Calm de-escalation
- Peace vibes but non-qualifying wording
- Sudden re-escalation
- Clean official end announcement

## Fixture Limitations

- Historical market overlay is fixture-backed and intended for product realism, not for claiming real trading history.
- Prisma persistence remains scaffolded but not yet implemented beyond fixture mode.

## Live Integration TODO

- Replace fixture adapters with real connectors for Truth Social, official statements, market feeds, flight activity, and overflight data.
- Persist normalized source events, signals, and belief snapshots in PostgreSQL.
- Add Redis-backed ingestion queues and scheduled jobs.
- Add authenticated analyst override workflows and audit logging.
