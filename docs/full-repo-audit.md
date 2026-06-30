# Full Repo Audit

## Scope
Audited the Next.js app, domain models, service layer, decision analytics, live timeline ingestion, tests, docs, startup scripts, and validation flow.

## Key findings
- Architecture is functional but feature-rich; dashboard and service assembly are now the highest-coupling surfaces.
- Core business logic mostly lives in `apps/web/src/lib`, which is good; UI still orchestrates many sections directly.
- Live market/timeline fetches intentionally make several routes dynamic; build logs dynamic-route fallbacks but succeeds.
- Some outputs are fixture/simulated and are now labeled in the UI/docs, but real edge still requires persisted decision/outcome history.
- Source URL extraction was duplicated in UI and clustering logic; this pass centralized it.
- Benchmark scaffolding was missing; this pass added a lightweight benchmark script.

## Product-critical paths
- `getDashboard()` -> belief engine -> decision/EV/backtest/regime/portfolio outputs -> dashboard.
- `getTimeline()` -> live feeds -> classification -> clustering/news summary -> timeline.
- `getSignalsExplorer()` -> normalized signals -> candidate impacts -> signal UI.

## High-risk areas
- Live API instability, especially Polymarket Gamma endpoint behavior.
- Simulation-backed calibration being mistaken for real historical performance.
- Large dashboard component becoming harder to reason about over time.
