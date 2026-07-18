# Architecture Overview

This repository contains a SignalOS / ProjectZero product workspace and portfolio presentation surface. The current product stack and commands are defined at the repository root, with the main web app in `apps/web`.

## Current Stack

- Next.js App Router in `apps/web`
- React and TypeScript
- Tailwind CSS
- Prisma schema for future PostgreSQL-backed persistence
- Fixture-backed adapters for deterministic local development
- Vitest for unit and integration tests
- ESLint and TypeScript checks from the repository root

## Important Directories

- `apps/web/src/app`: Next.js routes, including the main dashboard routes and presentation surfaces such as `showcase` and `signalos-v1`.
- `apps/web/src/components`: Shared app-shell and UI components.
- `apps/web/src/features`: Feature-level UI modules for model, replay, timeline, and related surfaces.
- `apps/web/src/modules`: Public domain modules for belief updates, market families, intelligence, and thesis scoring.
- `apps/web/src/lib`: API service composition, adapters, classifiers, repositories, shared types, utilities, and data-facing infrastructure.
- `prisma`: Prisma schema and seed script.
- `tests`: Vitest unit and integration coverage.
- `docs`: Architecture, validation, testing, and operating notes.
- `data`, `fixtures`, and `.projectzero`: Local datasets, fixtures, generated archive material, and local live-intel state.

## Product Shape

The portfolio-facing experience should behave like a vertical presentation deck:

- Each full-screen scroll section is one project or narrative unit.
- Each project should be understandable in one screen.
- There should be no normal portfolio grid.
- There should be no separate project detail pages.
- Navigation should preserve the current presentation feel and avoid adding visible app chrome unless explicitly scoped.

The existing application also includes analyst/product routes such as dashboard, signals, timeline, model, replay, rules, scenario lab, and admin surfaces. Do not collapse those routes into the portfolio deck or change deployed behavior unless an issue explicitly scopes that work.

## System Shape

The app is intentionally split into four layers:

1. `Adapters`
   Convert source-specific records into normalized `SourceEvent` and `Signal` objects.
2. `Domain Modules`
   Interpret language, organize evidence, compute latent state updates, and
   expose stable public contracts through `src/modules/*/index.ts`.
3. `Service Layer`
   Compose fixtures, repository reads, engine runs, and API responses.
4. `UI`
   Render analyst-oriented views over the same typed payloads.

The service layer now also owns:

- replay payload assembly with time-indexed market overlays
- candidate-signal projected-impact computation
- signal explorer aggregate payloads

## Domain Module Boundaries

The TypeScript domain has four explicit modules:

1. `belief`: prior curves, confidence, weights, updates, and explanations.
2. `markets`: market-family definitions, registry, and deterministic replay.
3. `intelligence`: source normalization, event clustering, and briefings.
4. `thesis`: evidence quality, hypotheses, scenarios, scoring, and decisions.

Routes, features, components, services, and tests consume module `index.ts`
files. They do not deep-import internal module files. `npm run
architecture:check` enforces this contract and also prevents domain modules from
depending on routes or UI code.

## Runtime Modes

- `Fixture mode`
  Uses `DemoRepository` and fixture-backed adapters for deterministic offline development.
- `Prisma mode`
  Routed through `PrismaRepository`, currently a guarded placeholder for future persistent reads.

## Core Latent States

- `trueDeescalationProbability`
- `formalAnnouncementProbability`
- `resolutionFrictionScore`

Final market probabilities are derived from these latents, deadline proximity, priors, and light market-friction adjustments.

## Why This Is Not Pure Bayes

The source data are heterogeneous, partially hand-curated, and not calibrated enough to justify pretending we have a full generative Bayesian model.

Instead, the engine uses:

- prior curves
- log-odds-like updates
- family weights
- confidence scaling
- recency decay
- contradiction penalties
- correlation penalties

This keeps the system transparent and auditable.

## Offline Development Strategy

All adapters currently run against `fixtures/demo.ts`.

That gives us:

- deterministic tests
- deterministic replay
- no external dependencies during development
- clear interfaces for future API-backed adapters

The fixture bundle now includes:

- current market snapshots for dashboard surfaces
- historical market series for replay/backtest overlays
- candidate signals and their raw source events

## Database Direction

Prisma models are already defined for:

- markets and rules
- source registry and source events
- signals and families
- belief snapshots and explanations
- scenarios
- weight profiles
- overrides
- replay sessions
- statement classifications
- ingestion jobs

The current repository is fixture-backed, but the schema is ready for a real persistence layer.

## Runtime And Validation

Repository-level scripts in `package.json` are the shared entry points:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run maint:check
```

`npm run dev` starts the Next.js app from `apps/web`. `npm run build` builds the same app. `npm run maint:check` runs lint, typecheck, tests, and build.

`make validate` is also available for the broader local pass: lint, typecheck, tests, production build, and benchmark.

## Data And Secrets

The current implementation is fixture-first for local development. Live integrations and persistent state must fail closed when source data, credentials, replay glue, or provenance are unavailable.

Never commit secrets, API keys, tokens, live credentials, private `.env` values, or source material that cannot be stored in the repository.

## Verified App Surface

The following have been validated in prior local passes:

- production build
- local dev boot
- route-level render sanity for the main analyst pages
- Prisma client generation
- replay market-overlay payload assembly
- candidate projected-impact computation
- Signal Explorer degraded-state handling
