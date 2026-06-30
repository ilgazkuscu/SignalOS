# Architecture Decisions

## Shared Source URL Helper

Decision: centralize source-event URL and domain extraction in `apps/web/src/lib/intelligence/source-url.ts`.

Why: source URLs are used by event clustering, source coverage rendering, and Signal Explorer drilldowns. Keeping one helper prevents mismatched canonicalization rules.

Alternative considered: leave the helpers local because they are short. Rejected because this is a trust-critical path and the code had already duplicated the logic.

## ESLint 9 Flat Config

Decision: add root `eslint.config.mjs` using `FlatCompat` for `next/core-web-vitals`.

Why: the repo installed ESLint 9, which ignores legacy `.eslintrc` by default. The lint script failed before any source file was checked.

Risk: `FlatCompat` keeps the config close to Next defaults but still relies on compatibility behavior. If the repo later upgrades Next/ESLint again, revisit this config.

## ADR: Keep analytics in `lib/*` and UI as renderer
Decision logic should remain outside React components. The dashboard receives typed payloads and renders them.

## ADR: Simulation must be labeled
Calibration/backtest outputs are useful plumbing but not real performance until backed by real outcomes. UI/docs must label fixture-simulated data.

## ADR: Fast polling before streaming
The app currently uses polling because live source reliability is still evolving. SSE/WebSocket should wait until adapters and data contracts stabilize.

## ADR: Shared source URL utility
Source links are trust-critical, so extraction is centralized in `lib/intelligence/source-url.ts`.
