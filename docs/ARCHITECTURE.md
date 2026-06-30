# Architecture Overview

## System Shape

The app is intentionally split into four layers:

1. `Adapters`
   Convert source-specific records into normalized `SourceEvent` and `Signal` objects.
2. `Classifier + Engine`
   Interpret language and compute latent state updates.
3. `Service Layer`
   Compose fixtures, repository reads, engine runs, and API responses.
4. `UI`
   Render analyst-oriented views over the same typed payloads.

The service layer now also owns:

- replay payload assembly with time-indexed market overlays
- candidate-signal projected-impact computation
- signal explorer aggregate payloads

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

## Verified App Surface

The following are now validated:

- production build
- local dev boot
- route-level render sanity for the main analyst pages
- Prisma client generation
- replay market-overlay payload assembly
- candidate projected-impact computation
- Signal Explorer degraded-state handling
