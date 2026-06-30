# Setup Guide

## Requirements

- Node 20+
- npm 10+
- PostgreSQL 15+ if you want to wire the Prisma schema to a real database

## Quick Start

1. Copy `.env.example` to `.env`.
2. Run `./run.sh`.
3. Open the printed local URL.

## Manual Start

1. Run `npm install`.
2. Run `npm run db:generate`.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `npm run dev`.

## Fixture-Only Mode

The current app is designed to run fully offline against fixture data. Database persistence is modeled, but the runtime path uses the fixture repository so you can work without external APIs or a live database.

## Live Intelligence Controls

The `.env` file now also controls the live timeline and alerting layer:

- `LIVE_TIMELINE_ENABLED`
- `LIVE_TIMELINE_POLL_INTERVAL_MS`
- `LIVE_TIMELINE_SOURCE_TTL_MS`
- `LIVE_TIMELINE_ARTICLE_FETCH_LIMIT`
- `LIVE_TIMELINE_DIRECT_URLS`
- `LIVE_TIMELINE_CATALYST_THRESHOLD`
- `LIVE_ALERT_GAP_THRESHOLD`
- `LIVE_ALERT_RELEVANCE_THRESHOLD`

These settings determine how many article links are followed for context, which stories make the catalyst feed, and how selective the alert layer should be.

`LIVE_TIMELINE_DIRECT_URLS` accepts a comma-separated list of direct pages or live blogs to ingest in addition to RSS feeds. This is the current path for NBC-style rolling updates.

The timeline now exposes source-level freshness metadata so the UI can distinguish fresh fetches, cached results, stale parsers, and outright failures.

`run.sh` checks `node` and `npm`, installs dependencies if `node_modules` is missing, runs Prisma client generation, and starts the dev server.

## Test Commands

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run seed`
- `npm run news:poll`
- `npm run news:loop`
- `npm run maint:check`

## Live Polling

- Run one live ingestion cycle with `npm run news:poll`.
- Run a local loop with `npm run news:loop`.
- Inspect persisted source health at `/api/timeline/health`.
- Local-first ingestion state is stored in `.projectzero/live-intel-store.json`.
- The health endpoint reports healthy/unhealthy source counts plus next poll due timestamps.

## Verified Local Endpoints

The following have been validated during local development:

- `/`
- `/model`
- `/scenario-lab`
- `/replay`
- `/signals`
- `/api/dashboard`
