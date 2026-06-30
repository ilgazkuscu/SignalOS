# ProjectZero Expert Handoff Manual

## Purpose Of This Document

This document is the shortest path for an expert operator, quant, ML engineer, intelligence engineer, or technical founder to take over ProjectZero and continue the work without reverse-engineering the entire repository from scratch.

It explains:

- what ProjectZero is trying to do
- what the current system actually does
- which models are currently in use
- which ideas are product vision vs implemented reality
- how the live data layer works
- where the key decision logic lives
- what the next takeover priorities should be

This document should be treated as the current handoff source of truth for takeover work.

## One-Sentence Description

ProjectZero is a transparent, analyst-grade decision engine for estimating whether a resolution-sensitive geopolitical prediction market resolves `YES` by each date bucket, using structured signals, live news overlays, and a market-vs-model decision layer.

## The Core Problem The Repo Is Solving

The central prediction target is not generic war forecasting.

The system is trying to answer a much narrower and more difficult question:

> Will a market with strict wording-sensitive rules resolve `YES` by a given date?

That requires separating:

1. real-world de-escalation or end-state probability
2. probability of a qualifying official statement
3. remaining wording / resolution friction

This distinction is the foundation of the whole codebase.

## The Most Important Concept

ProjectZero assumes:

> Reality and resolution are different.

Example:

- military tempo may decline
- diplomatic channels may open
- rhetoric may soften

and the market can still fail to resolve `YES` if there is no sufficiently explicit official public wording.

This is why the repo often looks "more conservative" than headline-driven intuition.

## What The System Is Today

ProjectZero today is best described as:

- an offline-first, fixture-backed analyst workbench
- with a live market and live news overlay
- backed by a transparent probabilistic belief engine
- followed by a decision layer for trade / watch / no-trade classification

The current stack is not a black-box ML system.

It is a structured scoring and probability system with traceable inputs and interpretable outputs.

## What Is Implemented Today

### Implemented And Working

- transparent probabilistic belief engine
- date-bucket market definitions
- fixture-backed historical and live-ish demo flows
- scenario injection
- deterministic replay / backtest
- live market overlay
- live news ingestion overlay
- source polling with conditional fetch support
- persisted source state
- due-source scheduling helpers
- dashboard health visibility for live ingestion
- trade decision generation
- thesis generation
- catalyst calendar
- cross-bucket dislocation analysis
- signal hit-rate tracking

### Partially Implemented

- live-source ingestion and model refresh bookkeeping
- scheduler loop using persisted due-source state
- live event classification into signal families
- dashboard operator visibility into ingestion health

### Not Implemented Yet

- neural network inference over video/audio
- micro-expression detection
- voice intonation analysis
- deception analysis
- multimodal world-leader behavioral modeling
- learned representation model over the signal/event graph
- real training pipeline for continuous online learning
- production queue/worker infra beyond local loop + persisted file state

## The Current Models Being Used

This section is the most important correction for any incoming expert:

### 1. Primary Belief Model: Rule-Based Probabilistic Belief Engine

Current implementation:

- `apps/web/src/lib/engine/belief-engine.ts`

This is the main model currently driving probabilities.

It is not a neural network.

It uses:

- priors
- family-weighted signals
- confidence weighting
- recency decay
- contradiction penalties
- correlation penalties
- hazard-based time accumulation
- resolution friction adjustment

It outputs:

- `trueDeescalationProbability`
- `formalAnnouncementProbability`
- `conditionalAnnouncementGivenEndProbability`
- `yesProbabilityByContract`
- `noProbabilityByContract`
- `decompositionByContract`
- confidence
- top positive and negative drivers

### 2. Prior Curve Model

Current implementation:

- `apps/web/src/lib/engine/prior.ts`

This creates the baseline probability curve before current evidence is applied.

It encodes assumptions such as:

- active hostilities
- ceasefire status
- formal wind-down tendency
- baseline duration

This is currently hand-crafted, not learned from data.

### 3. Confidence Model

Current implementation:

- `apps/web/src/lib/engine/confidence.ts`

This produces the belief engine's self-assessed confidence score and label.

Conceptually it reflects the quality of the active evidence stack:

- freshness
- verified coverage
- contradictions
- redundancy / correlation
- driver strength

This confidence score is later used by the decision layer.

### 4. Statement / Wording Classification Model

Current implementation:

- `apps/web/src/lib/classifiers/statement-classifier.ts`

This is another rules-based classifier.

It maps statements into labels like:

- `qualifies_yes_high`
- `qualifies_yes_ambiguous`
- `deescalation_but_not_resolution`
- `not_qualifying`
- `escalatory`

It is critical because market resolution depends on explicit wording.

### 5. Live Event Classification Layer

Current implementation:

- `apps/web/src/lib/timeline/classify-live-events.ts`

This derives low-confidence signal candidates from live news events and maps them into families such as:

- `resolutionWording`
- `forcePosture`
- `diplomaticChannels`
- `proxyTempo`

This is not a learned NLP model.
It is a structured heuristic classifier.

### 6. Trade Decision Model

Current implementation:

- `apps/web/src/lib/decision/trade-decision.ts`

This is not the belief model.
It is the actionability layer built on top of the belief model.

It combines:

- model-vs-market gap
- belief confidence
- catalyst nearness
- liquidity quality
- wording-risk penalty

to decide:

- `LONG_YES`
- `LONG_NO`
- `WATCH`
- `NO_TRADE`

### 7. Thesis Generation Layer

Current implementation:

- `apps/web/src/lib/decision/thesis.ts`

This is an explanation layer, not a predictive model.

It finds recent bullish, bearish, and wording-related events and generates operator-facing thesis/invalidation text.

### 8. Supporting Analytical Models

There are several secondary structured models or scoring utilities:

- regime detection
- execution rules
- portfolio summary
- expected value ranking
- cross-bucket dislocations
- signal hit-rate tracking
- catalyst calendar
- wording risk assessment

These are all deterministic or heuristic layers, not machine-learned models.

## What The Main Engine Actually Computes

The belief engine processes verified signals in chronological order.

For each signal it applies:

- family weight
- recency decay
- confidence scaling
- contradiction penalty
- correlation penalty

It then updates latent internal ledgers:

- `realLedger`
- `formalLedger`
- `friction`
- `explicitWordingImpulse`
- `trueEndImpulse`
- `qualifyingCatalyst`
- `contradictionLoad`

These are then transformed into:

- daily real-world de-escalation hazard
- daily announcement hazard

For each market bucket, the engine calculates:

1. `realEndByDate`
2. `announcementGivenEnd`
3. `frictionMultiplier`
4. final `yesProbability`

The operative formula is:

`P(real end by date) × P(qualifying announcement | real end) × friction multiplier`

This formula is explicitly represented in the belief engine output.

## Why The Market Price Matters

Market price is not used as the target truth label.

It is used as:

- a light adjustment inside the engine
- the comparison point for the decision layer

The system therefore has two distinct tasks:

1. estimate the world / resolution probability
2. decide whether the market is mispriced enough to justify action

That is why `gapSize` appears late in the pipeline: it is a tradeability concept, not a world-model concept.

## Current Data Flow

### Baseline Flow

1. Repository loads markets, signals, snapshots, history, and source events.
2. Live timeline overlay optionally enriches events and derives live signals.
3. Signals are merged into an active signal set.
4. Belief engine computes current belief state.
5. Decision modules compute:
   - theses
   - trade decisions
   - sizing guidance
   - opportunities
   - alerts
   - catalyst calendar
6. Dashboard payload is assembled.

Primary orchestration entrypoint:

- `apps/web/src/lib/api/service.ts`

## Live Intelligence Layer

### Current Purpose

The live intelligence layer exists to make the otherwise deterministic fixture workbench responsive to current developments.

### Current Live Sources

Current registry includes sources such as:

- New York Times World
- Wall Street Journal World
- BBC World
- Financial Times World
- Foreign Affairs
- Atlantic Council

The registry is defined in:

- `apps/web/src/lib/news/source-registry.ts`

### Fetching Behavior

The ingestion layer supports:

- conditional requests
- `ETag`
- `If-None-Match`
- `Last-Modified`
- `If-Modified-Since`
- request timeout
- retry and backoff
- persisted source state

Key files:

- `apps/web/src/lib/news/fetch-client.ts`
- `apps/web/src/lib/news/store.ts`
- `apps/web/src/lib/news/scheduler.ts`

### Scheduler State

Polling state is persisted locally in:

- `.projectzero/live-intel-store.json`

This store currently records:

- source state
- update dedupe state
- model refresh runs

### Polling Modes

Current commands:

- `npm run news:poll`
- `npm run news:loop`

The long-running loop now computes sleep from persisted due-source state instead of sleeping on a fixed cadence only.

### Health Visibility

Health is exposed via:

- `GET /api/timeline/health`
- dashboard live-ingestion panel
- timeline health summary

## What "Model Refresh" Means Today

This term needs careful handling.

Today, "model refresh" does not mean retraining an ML model.

It currently means:

- new normalized updates were detected
- a refresh run was recorded
- downstream state is considered refreshed / rescored

Current implementation:

- `apps/web/src/lib/news/model-refresh.ts`

This is bookkeeping and pipeline plumbing, not true learning.

## What The Project Vision Has Expanded Toward

The broader vision discussed so far includes:

- premium geopolitical intelligence product
- more actionable version of a live war-intel / event-monitoring board
- higher-frequency source monitoring
- richer event extraction and clustering
- multimodal analysis of official statements
- leader-specific communication pattern analysis
- micro-expression and intonation interpretation
- inference about what leaders "really mean" vs what they literally say

This vision is not yet implemented.

It should be treated as future product strategy, not current system capability.

## Important Distinction: Current Reality vs Future Vision

### Current Reality

ProjectZero is presently:

- a transparent analyst decision engine
- with deterministic components
- plus live ingestion overlays
- plus structured heuristics

### Future Vision

ProjectZero may later become:

- a multimodal intelligence platform
- using neural models over text, video, and audio
- with entity-specific representation learning
- and online updating pipelines

An incoming expert should not assume the current codebase already contains this second system.

It does not.

## Recommended Expert Decomposition Of The Project

An expert takeover should separate the system into five layers:

### Layer 1: Data Acquisition

- source registry
- fetch client
- conditional HTTP revalidation
- scheduler / polling
- persisted source state

### Layer 2: Event Normalization

- RSS/page parsing
- article context extraction
- update dedupe
- source event normalization

### Layer 3: Signal Inference

- statement classification
- live-event classification
- signal generation
- confidence assignment

### Layer 4: Belief Modeling

- priors
- hazard model
- latent-state updates
- bucket decomposition
- confidence estimation

### Layer 5: Action Layer

- market dislocation
- trade decisioning
- sizing
- alerts
- theses
- operator dashboard

This decomposition should be preserved even if the underlying models become more advanced.

## Takeover Priorities For An Expert

### Immediate Priority 1: Freeze The Current Engine Contract

Before replacing anything, preserve:

- current inputs
- current outputs
- decomposition structure
- dashboard contract
- replay behavior

Reason:

The transparency and auditability of the current belief engine are valuable, even if it is later replaced or augmented.

### Immediate Priority 2: Decide Whether ProjectZero Remains Explainable-First

There is a strategic fork:

1. keep an explainable rule-based engine as the production decision core
2. replace or augment it with learned models

If learned models are introduced, it is strongly recommended to keep the current engine as:

- benchmark baseline
- fallback engine
- explanatory shadow model

### Immediate Priority 3: Upgrade The Live Intelligence Layer

Best near-term engineering improvements:

- stronger source-specific parsers
- more precise event normalization
- better dedupe and clustering
- explicit source health UI
- route/UI smoke tests for operator health views
- richer model-refresh semantics

### Immediate Priority 4: Design A Proper Learned-Signal Layer

If the future vision is pursued, the next learned model should not be a giant end-to-end black box.

Recommended order:

1. learned text/event embedding and clustering
2. improved statement qualification model
3. source reliability and contradiction model
4. optional multimodal analysis

This is safer than jumping directly to "predict market resolution from everything."

### Immediate Priority 5: Keep The Market/Decision Layer Explicit

Even if learned models are added, keep:

- model probability
- market price
- dislocation gap
- risk adjustments
- operator-facing rationale

as first-class outputs.

## Recommended Future Model Stack

If an expert wants to evolve the system, a clean future architecture would look like:

### Current Engine Retained As Baseline

- rule-based belief engine
- replayable and auditable

### New Text Intelligence Layer

- embedding model for source events, statements, and clusters
- event similarity and cross-source consolidation
- contradiction and novelty detection

### Statement Qualification Model

- fine-tuned or prompted classifier for:
  - explicit end-language
  - ambiguity
  - officialness
  - likely market qualification

### Source Credibility Layer

- learned or semi-learned calibration of source reliability
- source-specific false-positive patterns

### Multimodal Layer (Future)

Only after the text/event layer is stable:

- video model for official address analysis
- audio model for prosody / intonation
- facial model for expression and behavioral cues

This should be treated as an optional higher-risk frontier layer.

## Strong Warnings For An Incoming Expert

### Warning 1

Do not confuse "model refresh" with true model retraining.

### Warning 2

Do not remove the reality-vs-resolution distinction.
It is the intellectual core of the product.

### Warning 3

Do not collapse everything into a single scalar score too early.
The decomposition is why the product is interpretable.

### Warning 4

Do not let live-news ingestion directly become truth without source-aware filtering and qualification logic.

### Warning 5

Do not replace the current engine with a black box unless you also preserve:

- replayability
- auditability
- explanation outputs

## Current Key Files

### Core

- `apps/web/src/lib/api/service.ts`
- `apps/web/src/lib/types/domain.ts`

### Belief Modeling

- `apps/web/src/lib/engine/belief-engine.ts`
- `apps/web/src/lib/engine/prior.ts`
- `apps/web/src/lib/engine/confidence.ts`
- `apps/web/src/lib/engine/profiles.ts`

### Decision Layer

- `apps/web/src/lib/decision/trade-decision.ts`
- `apps/web/src/lib/decision/thesis.ts`
- `apps/web/src/lib/decision/catalyst-calendar.ts`

### Live Layer

- `apps/web/src/lib/timeline/live-news.ts`
- `apps/web/src/lib/timeline/classify-live-events.ts`
- `apps/web/src/lib/news/source-registry.ts`
- `apps/web/src/lib/news/fetch-client.ts`
- `apps/web/src/lib/news/store.ts`
- `apps/web/src/lib/news/scheduler.ts`
- `apps/web/src/lib/news/model-refresh.ts`

### Operator Surfaces

- `apps/web/src/features/dashboard/dashboard-view.tsx`
- `apps/web/src/features/timeline/timeline-view.tsx`
- `apps/web/src/app/api/timeline/health/route.ts`

### Fixtures And Replay

- `fixtures/demo.ts`
- `tests/`

## Suggested Takeover Sequence

1. Read this file.
2. Read `docs/ARCHITECTURE.md`.
3. Read `docs/SCORING_MODEL.md`.
4. Read `docs/trade-decision-layer.md`.
5. Run:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
6. Inspect:
   - dashboard
   - timeline
   - replay
7. Decide whether takeover goal is:
   - maintenance and hardening
   - live data correctness
   - research/ML upgrade
   - productization

## Final Executive Summary

ProjectZero today is a transparent, structured, explainable geopolitical resolution engine with a live-ingestion overlay.

It is not yet a neural intelligence platform.

Its strongest idea is the explicit separation of:

- real end-state probability
- qualifying announcement probability
- resolution friction

Its most valuable current asset is not sophistication for its own sake, but interpretable decomposition.

An expert taking over should preserve that decomposition, harden the live layer, and only then decide how much learned modeling to introduce.
