# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/). See
[`docs/versioning.md`](docs/versioning.md) for the release workflow.

## Unreleased

### Changed

- Reorganized the TypeScript domain into explicit `belief`, `markets`,
  `intelligence`, and `thesis` modules with stable public entry points.
- Added automated module-boundary validation and a single CI quality gate.
- Renamed the npm workspace from its Iran-operations prototype name to
  SignalOS, aligned the Python intelligence service package, and established
  `0.2.0` as the modular baseline.

## 2026-06-01

- Added a default `How To` dashboard tab that explains the Hormuz Strait prediction-market bet in plain English for portfolio visitors, including the model/market/gap reading, signal sources, one-minute tour, and direct links to the dashboard, signals, news, replay, and original Polymarket market.
- Updated the public root redirect and dashboard missing-tab fallback to open the new `How To` tab first so recruiters who click the portfolio link see the nontechnical explanation before the deeper trading interface.

## 2026-05-13

- Fixed `/api/workspace` cache and in-flight request handling so `scope=core` and `scope=full` responses cannot cross-contaminate each other. This prevents the replay tab from intermittently receiving core-only payloads without replay history or snapshot data.
- Added a workspace-derived Model2 fallback so the `Model2`, `Signals2`, and dashboard Model2 overlays stay usable when the standalone SignalOS Python backend on `127.0.0.1:8000` is offline.
- Made fixture-mode reads safe outside the app layout provider so direct dashboard route rendering, tests, and previews do not crash.
- Reduced default live-feed blocking time by disabling article-page hydration unless explicitly configured and by failing slow feed requests fast. The dashboard now prefers timely headline data over waiting on sluggish third-party pages.
- Made standalone Model, Signals, Timeline, Journal, and Scenario Lab page renders use cached or fixture timeline data first, while leaving API refreshes on the live path. This keeps tabs usable under slow third-party news-source conditions without poisoning the live API cache.
- Added immediate client-side revalidation for Timeline, Replay, Snapshots, Dashboard, Model, Journal, and Scenario Lab views so tabs do not wait for the first polling interval before pulling fresh API data.
- Updated Polymarket Iran ladder slugs and added fallback slug candidates so stale environment overrides do not leave Apr 30, May 31, or Jun 30 stuck on 404-only fixture fallback.
- Split repository fixture fallback from fixture-only runtime mode so production can keep its fixture-backed repository seed data while correctly surfacing live Polymarket and timeline adapters in the UI and API payloads.
- Removed stale demo framing from the live multi-market snapshots page so the page copy matches the deployed live/fallback data mode.
- Corrected admin and manual-signal API mode reporting, made non-persistent manual signal ingestion fail explicitly instead of pretending to accept data, and removed stale fixture-only copy from Admin and Replay surfaces.
- Added an explicit accessible loading state for dashboard tabs so slow workspace requests no longer leave a tab looking empty while data is still loading.
- Changed the public root URL to redirect at the platform layer into the active dashboard instead of forcing users through a workspace-selection landing page.
- Routed the public dashboard default to the still-open Hormuz ladder, added May 15 / May 22 / June 30 live Hormuz contracts, and made resolved Iran contracts render as closed archive rows instead of active trade opportunities.
- Fixed the Hormuz header's Polymarket CTA so it points to the live event page instead of a 404 event URL built from a market slug; market-slug fallbacks now use `/market/...`.
- Restored Model2 bucket probabilities on the active Hormuz dashboard ladder by applying the existing workspace-derived Model2 fallback outside the Iran-only ladder.
- Centralized the expanded Hormuz ladder order/deadlines so dashboard, snapshots, and API payloads all include May 15 / May 22 / May 31 / June 30 with configured contract deadlines instead of stale event-level dates.
- Removed non-functional settings/profile chrome from the dashboard header, added a real disabled/loading state to Refresh, and constrained the bet selector/dropdown so it stays inside phone-width viewports.
- Added a plain-English Current Read panel to the default dashboard, made the active chart horizontally usable on mobile, reduced oversized card radii, and changed the tab bar to a phone-friendly horizontal control.
