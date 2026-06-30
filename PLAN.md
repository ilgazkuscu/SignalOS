# ProjectZero Maintenance Plan

1. Title: Make the polling loop honor persisted due-source state
   Why it matters: The repo already tracks per-source cadence and backoff, but the long-running loop still sleeps on a fixed interval. That wastes cycles and weakens freshness guarantees.
   Status: done
   Validation method: `npm test -- --run tests/unit/scheduler.test.ts`

2. Title: Surface ingestion health in the dashboard UI
   Why it matters: Operators should not have to jump to the timeline or an API route to see whether live intelligence is healthy.
   Status: done
   Validation method: `npm run typecheck && npm run lint`

3. Title: Harden health-summary coverage with targeted tests
   Why it matters: The health layer is the operator's trust surface; regressions here create silent failures.
   Status: done
   Validation method: `npm test -- --run tests/unit/*health* tests/unit/scheduler.test.ts`
