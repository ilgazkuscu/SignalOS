# Codex Prompt: Upgrade ProjectZero Into A Premium Live Intelligence System

You are working in the `projectZero` repository.

Your job is to upgrade the current live-ingestion and model-refresh system so the product behaves like a premium, analyst-grade live intelligence platform rather than a mostly fixture-backed dashboard.

## First: understand the current state

Before changing code, inspect the current implementation and summarize what is true today.

You must verify at least:

- how often Polymarket data refreshes
- how often the live timeline/news layer refreshes
- whether live news is cached server-side
- which feeds are currently ingested
- whether the system ingests direct article URLs or only RSS headlines/summaries
- whether NBC live blogs like `https://www.nbcnews.com/world/iran/live-blog/live-updates-trump-iran-hormuz-israel-lebanon-ceasefire-talks-pakistan-rcna285140` are currently supported
- whether the dashboard and timeline are truly updating every minute or only re-requesting cached data
- how much of the final model is still fixture-backed

Do not assume. Read the existing code first and report the truth.

## Product goal

We want ProjectZero to become a premium and more actionable intelligence system inspired by the usefulness and immediacy of sites like Pizzint, but with materially better structure, signal extraction, and decision support.

The system should:

- ingest fresh news continuously
- detect relevant geopolitical developments fast
- classify them into structured signals
- update model outputs regularly
- produce clearer, higher-value analyst insights
- distinguish headline noise from actual market-relevant developments
- preserve traceability from model outputs back to source evidence

## What the upgraded system must do

Implement the following, using the repo’s existing patterns where possible.

### 1. Reliable live ingestion

Build a live ingestion pipeline that can regularly fetch and normalize:

- RSS feeds
- article pages
- live blog pages
- source pages that update incrementally over time

The pipeline must support sources like:

- major world news outlets
- official government statements
- defense / foreign policy analysis outlets
- live blogs and rolling-update pages

NBC-style live blogs should be supported if technically feasible. If a source blocks scraping or requires a specialized adapter, implement the adapter boundary and document the limitation clearly.

### 2. One-minute freshness target

Move the system toward a genuine one-minute refresh target for live intelligence.

That means:

- client refresh interval should be configurable
- server-side cache TTL should be configurable
- the timeline/dashboard should not pretend to be fresher than the underlying cache
- freshness metadata should explicitly show:
  - last fetch attempt
  - last successful fetch
  - cache age
  - source-level status

If one-minute polling is too aggressive for a given source, implement source-specific throttling instead of one global setting.

### 3. Source adapters and normalization

Add or refactor source adapters so the system can normalize:

- headline
- timestamp
- source
- URL
- body/excerpt
- update sequence for live blogs
- quoted language
- geopolitical relevance
- confidence / reliability metadata

For live blogs, try to preserve each incremental update as its own normalized event when possible, rather than collapsing the whole page into one blob.

### 4. Stronger event classification

Upgrade the event classification layer so the system can more clearly distinguish:

- de-escalation language
- ambiguous wording
- procedural / diplomatic movement
- military posture changes
- media noise
- official resolution-relevant wording
- market-moving but non-resolving narrative shifts

If there are obvious opportunities to improve the heuristics without introducing heavyweight dependencies, implement them.

### 5. Better analyst-facing output

Improve the UI payloads and surface area so the product becomes more actionable.

Focus on:

- what changed
- why it matters
- what it changes in the model
- how strong the evidence is
- what to watch next
- whether the item affects “real world de-escalation” or “resolution wording” or both

Do not make the dashboard noisy again. Keep the output concise and legible.

### 6. Observability and failure handling

Add enough instrumentation so the system can show:

- source fetch failures
- parser failures
- stale feeds
- partial ingestion success
- fallback behavior

The system should degrade gracefully and keep the last good data on screen when live fetching fails.

## Important constraints

- Prefer existing repo patterns over inventing a new architecture.
- Keep changes scoped and composable.
- Do not fake freshness.
- Do not silently mark fixture data as live.
- Do not rely on a single source.
- Preserve testability.
- Add focused tests for new parsing/normalization logic and refresh behavior.

## Deliverables

1. Implement the live-ingestion upgrades.
2. Update the dashboard/timeline data plumbing if needed.
3. Add or update tests.
4. Add documentation describing:
   - current source coverage
   - refresh behavior
   - known limitations
   - how to add a new source adapter
5. In your final response, include:
   - what was changed
   - what is truly live now
   - what is still limited
   - what still needs a future phase

## Longer-term direction

This is not for this implementation pass, but keep the architecture friendly to a future intelligence layer that may use:

- voice analysis
- wording analysis
- facial / micro-expression signals
- leader-specific behavioral priors
- multimodal neural models for statement interpretation

Do not build those speculative systems now unless the existing repo already has a natural placeholder for them. Just avoid designing today’s ingestion layer in a way that blocks them later.
