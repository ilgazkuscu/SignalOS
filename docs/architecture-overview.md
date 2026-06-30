# Architecture Overview

The app is a Next.js workbench with a typed domain model and fixture-first data repository.

## Flow
Repository -> service layer -> analytics engines -> typed payload -> feature UI.

## Design principle
Business logic belongs in `apps/web/src/lib`. UI components should mostly render typed outputs.

## Main composition root
`apps/web/src/lib/api/service.ts` assembles dashboard, timeline, replay, and signal payloads.
