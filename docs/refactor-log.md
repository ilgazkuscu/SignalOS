# Refactor Log

## 2026-04-10 Repo-Wide Pass

- Extracted shared source URL/domain helpers into `apps/web/src/lib/intelligence/source-url.ts`.
- Updated event clustering and Signal Explorer source-link rendering to use the shared helper.
- Added a root `eslint.config.mjs` flat config for ESLint 9 compatibility.
- Removed stale `eslint-disable-next-line no-var` comments from global cache declarations after confirming the flat config no longer reports those declarations.

## Why This Was Worth Doing

Source coverage is a trust surface. Duplicated URL parsing creates a subtle risk where the clustering layer and UI disagree on what is clickable or canonical. Centralizing it reduces that drift without changing the domain model.

Lint was also a broken script. A script that exists but cannot run is workflow debt; making it pass lets `make validate` represent a real quality gate.

## This pass
- Added `lib/intelligence/source-url.ts` to centralize source URL/domain extraction.
- Updated clustering and Signal Explorer to use the shared URL utility.
- Added `scripts/benchmark.ts` and package/Makefile commands for repeatable performance checks.

## Why
Source URL extraction was duplicated across UI and clustering, which increased risk of inconsistent clickable coverage behavior. Benchmarking did not exist, so performance claims could not be reproduced.

## Remaining messy areas
- `dashboard-view.tsx` is still large and should be split into section components.
- `service.ts` remains the main composition root and should eventually delegate dashboard assembly to smaller builders.
