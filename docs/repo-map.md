# Repo Map

## Top level
- `apps/web`: Next.js app.
- `fixtures`: deterministic demo data.
- `prisma`: database schema and seed path.
- `tests`: unit and integration tests.
- `docs`: engineering/product docs.
- `md`: commercial/product notes.
- `scripts`: local benchmark and utility scripts.

## Critical modules
- `lib/engine`: belief and probabilistic scoring.
- `lib/decision`: trade decision, thesis, dislocation, catalyst, hit-rate.
- `lib/backtest`, `lib/edge`, `lib/execution`, `lib/portfolio`, `lib/regime`, `lib/wording`: edge feedback-loop layer.
- `lib/timeline`, `lib/intelligence`: live news ingestion, classification, clustering, summaries.
- `lib/api/service.ts`: service aggregator for app routes.

## UI surfaces
- `features/dashboard`: decision and performance cockpit.
- `features/timeline`: executive brief and live source coverage.
- `features/signals`: signal explorer and source drilldown.
- `features/playbook`: onboarding and operator guide.
