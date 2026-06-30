# IRAN OPS ENDGAME ENGINE PRD

## Purpose

IRAN OPS ENDGAME ENGINE is an offline-first Next.js and TypeScript application for estimating whether the Polymarket-style contract family "Trump announces end of military operations against Iran by [date]" resolves `YES` by each listed date bucket.

## Core Product Principles

- Separate real-world de-escalation from formal qualifying announcement probability.
- Preserve date-bucket probabilities and marginal bucket probabilities.
- Keep the model transparent, explainable, and auditable.
- Support fixture-backed local development and deterministic replay.
- Support scenario simulation and analyst workflow.
- Prepare for future live data adapters without breaking offline mode.

## Functional Requirements

- Dashboard showing model vs market probabilities by bucket.
- Signal explorer with raw source traceability.
- Timeline view for chronological event review.
- Scenario lab for hypothetical event injection.
- Replay / backtest view for deterministic historical stepping.
- Resolution rules view for market wording interpretation.
- Admin weights view for profile inspection and tuning workflow.

## Technical Requirements

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma schema and client generation
- Offline fixture mode
- Tests for classifier, engine, and API service behavior
- Buildable local app

## Current Verified State

- Node, npm, and npx are installed locally.
- Dependencies install successfully.
- Typecheck passes.
- Tests pass.
- Prisma client generation works.
- Build passes.
- Dev server boots and serves the dashboard, scenario lab, and replay routes.

## Current Highest Priority

1. Keep docs aligned with validated behavior and workflow.
2. Preserve offline-first determinism while preparing future live adapters.
3. Continue improving analyst-facing clarity without weakening explainability.
