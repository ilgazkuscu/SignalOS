# SignalOS Interview Readiness

## One-sentence answer

SignalOS is an AI automation layer that turns noisy public signals into a ranked operational decision: what changed, how much the model moved, which market or action is affected, and what a human should do next.

## Minimal Working Product

Keep the structure small:

1. Ingest
   - Pull live feeds, market prices, official statements, and OSINT-style indicators.
   - Existing repo paths: `signalos/ingestion/*`, `scripts/run_ingest.py`, `.projectzero/live-intel-store.json`.

2. Normalize
   - Convert raw headlines/events into stable feature columns such as tanker activity, B-2 posture, carrier posture, diplomatic drawdown, Israel activity, and signal quality.
   - Existing repo paths: `signalos/features/pipeline.py`, `apps/web/src/lib/signalos/fallback-model2.ts`.

3. Score
   - Use the phase model, survival horizon, market gap, and decision layer to answer: phase, time horizon, model-vs-market gap, trade/watch/no-trade.
   - Existing repo paths: `signalos/api/deps.py`, `docs/trade-decision-layer.md`, `docs/execution-rules.md`.

4. Explain
   - Show which signals moved, previous vs current values, posterior phase vector, closest historical analogs, and source evidence.
   - Existing repo paths: `apps/web/src/app/dashboard/model2-tab.tsx`, `docs/ANALYST_WORKFLOW.md`.

5. Alert
   - Send an alert only when the phase rises and posterior confidence moves meaningfully.
   - Existing repo paths: `signalos/api/main.py`, `signalos/alerts/discord.py`, `signalos/alerts/telegram.py`.

6. Prove
   - Track whether fired signals led to useful market moves or better decisions.
   - Existing repo paths: `docs/signal-hit-rate-tracking.md`, `docs/performance-tracking.md`, `docs/backtesting.md`.

## After Ingestion, Then What?

Raw input is not the product. The useful chain is:

`raw event -> normalized signal -> feature delta -> model posterior shift -> market/decision delta -> human action`

Example:

- Raw event: "ordered departure notice for Iraq" appears in a State Department or news source.
- Normalized signal: `ordered_departure_iraq = 1`.
- Model effect: phase posterior moves toward higher operational readiness.
- Decision effect: strike horizon rises, model-vs-market gap changes, trade score changes.
- Human action: analyst stops treating it as background noise, opens the linked evidence, checks the affected contract bucket, and either moves from `NO_TRADE` to `WATCH`, sizes an existing position down, or escalates the event to a human review channel.

## Whose Problem It Solves

Today it is not Mia's paid-growth world. It is a geopolitical/market-intelligence workflow.

The target user is an analyst, trader, risk operator, or AI automation team that needs to monitor too many weak signals without manually refreshing news, market prices, and source feeds all day.

The business metric is not ROAS or CAC unless the product is retargeted for marketing. The metrics here are:

- decision latency: how quickly the user notices a meaningful shift
- analyst time saved: fewer manual feed checks
- edge quality: whether model-vs-market gaps are caught earlier
- risk control: fewer positions held through stale or invalidated signals
- calibration: whether phase probabilities and signal hit rates improve over time

If an interviewer asks about Mia:

"If Mia is a growth operator, SignalOS is the same automation pattern but not the same domain. In her world I would replace geopolitical signals with spend, CAC, creative fatigue, conversion-rate shifts, and inventory/revenue signals. The output would become: pause this campaign, increase budget here, investigate this CAC spike. The repo I built proves the automation architecture: ingestion, normalization, scoring, explanation, alerting, and feedback measurement."

## What The Human Literally Sees

In the current repo, the human sees:

- Dashboard overview: model probability vs market probability, largest gap, decision stance, alerts.
- Model2 tab: current phase, posterior vector, time-to-kinetic probabilities, top analogs, change monitor.
- Signal explorer: source, confidence, direction, status, impact, stale/correlation flags.
- Replay page: whether the model moved before or after market movement.
- Alert channel: Discord/Telegram message when phase rises enough to matter.

Best interview phrasing:

"I didn't want a model that just says 'interesting.' I wanted an operator screen. The output says what changed, why it changed, what contract or action it touches, and whether the user should trade, watch, or do nothing."

## Proof It Works

Current proof level:

- The app has a working offline-first dashboard and fallback model.
- Live-intel storage shows source polling and model refresh runs.
- The backend has phase, model, edge, and backtest endpoints.
- Docs define hit-rate, calibration, and backtest methodology.

Honest limitation:

- It is not yet proven with real realized PnL or production operator usage.
- Some proof is fixture/simulation-backed.

Best interview phrasing:

"The honest proof today is functional proof and evaluation scaffolding, not a mature production alpha claim. It ingests source updates, converts them into model-affecting signals, exposes the change to a dashboard, and has the beginnings of hit-rate and backtest tracking. The next proof milestone is persisted decision snapshots and realized outcome comparison."

## One Real Example From The Workspace

The live-intel store recorded a model refresh run on 2026-05-15 that processed two normalized live updates. Some feed items were marked `modelAffected: true`, which means the system distinguished between ambient news and events worth sending into the model refresh path.

Interview framing:

"A small but real example: the ingestion layer did not treat every headline equally. It marked some updates as model-affecting and ignored others as ambient. That matters because the automation is filtering noise before it reaches the decision layer."

## AI Automation Role Pitch

Use this as the main story:

"I built SignalOS as an AI automation system for decision intelligence. The hard part was not just scraping data. The hard part was designing the loop after ingestion: normalize messy events, score them against a transparent model, explain what moved, route alerts only when thresholds are crossed, and measure whether those alerts were useful. That maps directly to automation work: connect sources, create reliable intermediate representations, trigger workflows, keep humans in the loop, and instrument feedback."

## Strong Interview Answers

Question: "So what happens after a signal gets ingested?"

Answer:

"It gets normalized into a typed signal and feature column. Then the model recomputes phase probability and time horizon. The decision layer compares that to market pricing and outputs trade, watch, or no-trade. The dashboard shows what moved and why. If the phase jumps enough, it sends an alert."

Question: "What does the user do differently?"

Answer:

"They stop manually scanning every feed. They look at a ranked change monitor and act only when a signal changes the decision surface. That could mean review evidence, move an item to watch, avoid a bad trade, or escalate to a channel."

Question: "Does it touch revenue, CAC, ROAS?"

Answer:

"In this domain it touches market edge and risk, not CAC or ROAS. The equivalent business metric is decision quality: earlier detection, fewer stale decisions, better calibration, and less analyst time wasted. The architecture could be reused for Mia's growth world by swapping in spend, ROAS, CAC, revenue, creative, and funnel signals."

Question: "What does the output look like?"

Answer:

"Dashboard plus alert. The dashboard shows current phase, posterior vector, time-to-event horizon, top changed features, model-vs-market gap, and trade/watch/no-trade. Alerts go to Discord or Telegram when a phase shift crosses a confidence threshold."

Question: "How do you know it works?"

Answer:

"I can prove the pipeline works end to end. The stronger production proof is still a next step: persist every recommendation, compare against subsequent market movement or final resolution, and report hit rate by signal family."

## Next Build Steps

1. Make the dashboard's top card say the operational answer in plain language:
   - "Phase moved P2 -> P3"
   - "Why: ordered departure, tanker bridge, carrier posture"
   - "Action: WATCH / LONG_NO / LONG_YES / NO_TRADE"

2. Persist every alert and decision snapshot:
   - timestamp
   - raw evidence URL
   - normalized signal
   - feature delta
   - prior/posterior probability
   - decision stance
   - market price at decision time

3. Add a proof page:
   - total alerts fired
   - useful move rate
   - average market move after alert
   - false-positive examples
   - top-performing signal families

4. Add one demo script:
   - inject a known signal
   - show model movement
   - show dashboard output
   - show alert payload
   - show where it is logged for evaluation

5. Retargeting option for Mia:
   - Replace OSINT feeds with ad platform, analytics, CRM, and revenue feeds.
   - Replace phase model with "growth health" state.
   - Replace trade/watch/no-trade with "scale/pause/investigate/hold."
   - Measure ROAS, CAC, revenue, and spend waste.

