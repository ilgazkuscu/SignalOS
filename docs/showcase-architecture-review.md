# SignalOS architecture review — 18 September 2026

## Scope and evidence

Add one architecture slide to the existing showcase deck. Preserve the replay,
analyst routes, data, and forecasting behavior. Separate implemented capabilities
from production recommendations. This change does not provision infrastructure.

Verified against repository commit `06beed7`:

- `apps/web/src/modules/*/index.ts`: four domain modules (`intelligence`,
  `thesis`, `belief`, `markets`) with enforced import boundaries.
- `apps/web/src/lib/api/service.ts` and `src/app/api`: application composition
  and Next.js route handlers. FastAPI is not the only API serving the dashboard.
- `apps/web/src/lib/db/prisma-repository.ts`: persistent read methods throw
  explicitly; the PostgreSQL schema is not a completed production data layer.
- `apps/web/src/lib/news/store.ts`: local JSON state, not durable cross-instance
  storage. `src/lib/news/scheduler.ts` and polling scripts provide polling logic.
- `apps/web/src/app/showcase/data.ts`: curated replay values; this presentation
  is not a live forecast-performance record.
- `signalos/api/main.py`: optional Python/FastAPI research runtime, including
  scheduled alerts. `src/app/api/signalos/model2/route.ts` currently tries a
  loopback Python service and falls back when it is unavailable.

The provided production URL is `https://projectzero-dashboard.vercel.app/showcase`.
Its rendered showcase differs from the current GitHub source. Confirm the intended
Vercel project and deployment source before replacing that production deployment.

## Recommendation

There is no single September 2026 architecture standard that establishes an
optimal topology. Cost, event volume, latency, operational capacity, and data
retention determine the right design. No load or cost benchmark was run here;
this is a fit-for-stage recommendation.

For a small-team forecasting product, keep a modular monolith and add a durable
background execution path. Start with three operational units: the Next.js web/API
application, a bounded worker runtime, and managed PostgreSQL. Keep the domain
modules as code boundaries rather than deploying a service for every box.

```text
Public sources -> scheduled/bounded jobs -> domain processing -> PostgreSQL
                                               ^                   |
                                               |            Next.js read API
                                reviewed model revisions           |
                                               |              dashboard
Resolved outcomes -> offline evaluation -------+
```

The worker also reads prior evidence and forecasts from PostgreSQL. Forecasts and
explanations are queryable immediately; outcome evaluation is a parallel path,
not a prerequisite for API access. Resolution checks compare the actual contract
rules and outcomes separately from estimates of the underlying real-world event.

## Highest-value changes, in order

1. **Finish persistence.** Implement the repository with migrations, indexes,
   connection pooling and backups. Persist publication time, first-observed time,
   source URL/content hash, evidence IDs, model/configuration version, and forecast
   creation time. A replay must not consume evidence observed after its cutoff.
   Keep fixture provenance visible; a fallback cannot silently become live data.
2. **Make work durable.** Use a PostgreSQL-backed job queue or an existing durable
   job framework appropriate to the runtime. Claim jobs atomically, commit short
   transactions, use leases, retry with backoff, bound attempts, and retain failed
   jobs for inspection. Enqueue alongside evidence in one transaction (or use an
   outbox). Unique keys and idempotent writes prevent duplicate effects. Merely
   using `SKIP LOCKED` does not supply those guarantees.
3. **Compute incrementally.** Deduplicate first, respect ETag/Last-Modified,
   batch where possible, recompute only affected events, and cache derived read
   payloads. Track queue lag, source freshness, failure rates, processing cost and
   end-to-end latency before deciding where to scale.
4. **Keep inference controlled.** Preserve deterministic scoring and replay. If
   an LLM is added for extraction, require schema-validated evidence with source
   references, explicit missing values, versioned prompts/models and cost limits.
   Escalate ambiguous cases selectively. A 0–1 evidence score is not automatically
   a calibrated event probability.
5. **Evaluate on future outcomes.** Add prospective forecast snapshots, verified
   resolutions, Brier/log loss, reliability plots and timestamp-matched market/base
   rate benchmarks. Use held-out periods and sufficient samples. If market price
   enters the forecast, report that dependency and an ablation. Source contribution
   needs out-of-sample analysis; source agreement alone does not prove accuracy.
   Promote model revisions after evaluation, not by automatic unchecked feedback.

These recommendations are not all implemented by the showcase change.

## Deployment boundaries

Vercel is suitable for the Next.js presentation and bounded request handlers.
Function invocations have duration limits; local filesystem state is not a durable
shared database. Run continuous feeds/heavy research work in a worker runtime or
durable workflow service. Short scheduled jobs can run in a bounded environment
when they respect its limits and store progress externally.

Keep Python/FastAPI if the Python models justify it. Configure a real authenticated
service endpoint if deployed separately; `127.0.0.1:8000` inside Vercel does not
refer to the developer's machine. Avoid implementing the same model twice across
Python and TypeScript. Keep one owner for each model and version its contract.

Add a dedicated broker, streaming platform or independently deployed services
only when measured queue contention, throughput, isolation or organizational
ownership requires them. The recommendation is not “Postgres scales forever.”

## Current primary references

Reviewed 18 September 2026. These support the design tradeoffs; they do not certify
SignalOS or prescribe a universal stack.

- [PostgreSQL SELECT / locking clauses](https://www.postgresql.org/docs/current/sql-select.html):
  `SKIP LOCKED` is useful for multiple consumers of a queue-like table, but offers
  an inconsistent view and is not a general-purpose read strategy.
- [FastAPI background tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/):
  distinguishes small same-process tasks from heavier background computation.
- [Vercel function limits](https://vercel.com/docs/functions/limitations): bounded
  invocations and filesystem constraints determine worker placement.
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents):
  use the simplest sufficient workflow and justify additional complexity with
  measured performance; extra agent calls add latency and cost.

## Review criteria

- Eight navigable slides; the hero's “Reveal the System” opens architecture.
- Desktop and phone layouts remain readable without horizontal overflow.
- Architecture view controls are keyboard-accessible and announce selection.
- Proposed workers, PostgreSQL queue, and outcome feedback are clearly marked as
  proposed; no claim of deployed persistence, continuous learning, or live returns.
- No new dependency, external request, or change to forecast computation.

Rollback: revert the architecture component, its page integration, and the matching
documentation/changelog additions. No database or environment migration is needed.

## Validation performed

- `npm run validate`: module boundaries, lint, types, 35 test files / 104 tests,
  and production build passed.
- After the navigation refinements: lint, typecheck and production build passed.
- Chromium: eight sections; direct hash; hero jump; both architecture views;
  Enter, Home and End navigation; reduced-motion and normal-motion behavior.
- 1440px desktop and 390px/320px mobile checks: no horizontal overflow or browser
  errors. Tall mobile architecture sections retain their active slide indicator.
- Review images are in `docs/showcase-architecture-assets/`.
- Existing warnings: Next.js infers a workspace root above the checkout because
  of another lockfile; the existing test suite emits a React `act` warning and
  live-source logs. These did not fail validation. No unrelated fix was included.
- No new dependency or public domain-module contract change.

Live deployment was not performed: `vercel inspect` rejected the saved credential
as invalid. The change is prepared on a dedicated branch for review and deployment
after authentication and target verification.
