# Quantitative Political Prediction Engine: Variable Manual

This document translates high-level political constructs into exact variables the models can consume.

## How to read this

Each construct includes:

- `construct`: the theoretical idea
- `columns`: measurable inputs
- `cadence`: how often the signal should refresh
- `model_use`: where the signal belongs in the stack
- `failure_modes`: what can go wrong in measurement

The rule is simple:

Do not feed vague concepts into the model.
Feed documented proxy variables into the model.

---

## 1. Escalation

### Construct
Rising probability of coercion, conflict expansion, military action, or hostile bargaining.

### Columns

- `cameo_conflict_count_1d`
  - count of 1-day conflict/coercion event codes
- `cameo_conflict_count_7d`
  - rolling 7-day conflict/coercion event count
- `goldstein_conflict_sum_7d`
  - 7-day sum of negative Goldstein-weighted events
- `battle_event_count_7d`
  - count of violent events in the last 7 days
- `fatality_count_7d`
  - total reported fatalities in the last 7 days
- `cross_border_strike_indicator_7d`
  - binary feature for reported cross-border strike or attack activity
- `shock_event_count_3d`
  - number of high-salience events in the last 3 days

### Cadence
Hourly ingestion, daily aggregation.

### Model use

- Bayesian update: yes
- Hazard model: yes
- Regime model: yes
- Tree model: yes

### Failure modes

- media overreaction to a single event
- duplication across wire services
- conflict underreporting in censored environments

---

## 2. De-Escalation

### Construct
Rising probability of talks, cooling rhetoric, ceasefire movement, or lower operational tempo.

### Columns

- `cameo_cooperation_count_1d`
  - count of same-day cooperative event codes
- `cameo_cooperation_count_7d`
  - rolling 7-day cooperative event count
- `goldstein_cooperation_sum_7d`
  - 7-day sum of positive Goldstein-weighted events
- `official_meeting_count_7d`
  - count of verified official meetings, calls, or summits
- `ceasefire_reference_count_7d`
  - number of reported ceasefire or truce references
- `diplomatic_progress_score_7d`
  - weighted score for negotiation language in official channels
- `violence_decline_ratio_7d`
  - decline in violent events relative to trailing baseline

### Cadence
Hourly ingestion, daily aggregation.

### Model use

- Bayesian update: yes
- Hazard model: yes
- Regime model: yes
- Tree model: yes

### Failure modes

- performative diplomacy with no operational follow-through
- one-sided statements misread as bilateral progress
- stale articles overstating old developments

---

## 3. Negotiation

### Construct
Actual bargaining activity, not just vague public rhetoric.

### Columns

- `official_talks_count_7d`
  - count of official negotiation events
- `backchannel_reference_count_7d`
  - count of credible backchannel reports
- `mediator_activity_count_7d`
  - count of reports involving mediators or intermediaries
- `agreement_draft_indicator_7d`
  - binary flag for reported draft or framework circulation
- `joint_statement_indicator_7d`
  - binary flag for joint statement or coordinated official release
- `negotiation_cadence_gap_days`
  - days since last confirmed negotiation event

### Cadence
Daily.

### Model use

- Bayesian update: yes
- Hazard model: yes
- Regime model: limited
- Tree model: yes

### Failure modes

- anonymous sourcing without verification
- recycled rumors
- headline confusion between “contacts” and “real negotiation”

---

## 4. Military Pressure

### Construct
Observable evidence that actors are positioning for force or coercive signaling.

### Columns

- `air_sortie_signal_3d`
  - rolling proxy count of unusual military aviation references
- `force_movement_count_7d`
  - count of reported troop/naval/air asset movements
- `weapons_deployment_indicator_7d`
  - binary indicator for notable deployment reports
- `missile_reference_count_7d`
  - rolling count of missile/air defense/long-range strike mentions
- `mobilization_reference_count_7d`
  - count of mobilization or readiness references
- `pentagon_alert_score_3d`
  - weighted score for official readiness or force posture statements

### Cadence
Hourly ingestion, daily aggregation.

### Model use

- Bayesian update: yes
- Hazard model: yes
- Regime model: yes
- Tree model: yes

### Failure modes

- noisy open-source military chatter
- false positives from exercises or logistics
- selective visibility by theater

---

## 5. Regime Fragility

### Construct
Underlying vulnerability of the political system to instability, elite fracture, or loss of control.

### Columns

- `vdem_regime_score`
  - institutional regime quality / democracy-autocracy measure
- `elite_fragmentation_score`
  - proxy score for elite division, turnover, or faction conflict
- `protest_event_count_30d`
  - protests in the last 30 days
- `repression_event_count_30d`
  - repression or crackdown events in the last 30 days
- `inflation_stress_score`
  - inflation or price instability proxy
- `gdp_growth_proxy`
  - recent growth deterioration proxy
- `instability_history_count_365d`
  - count of instability events in prior year

### Cadence
Weekly or monthly for structural inputs; daily for event overlays.

### Model use

- Bayesian update: yes
- Hazard model: limited
- Regime model: yes
- Tree model: yes

### Failure modes

- slow structural variables can lag reality
- cross-country comparability issues
- proxy quality varies by country

---

## 6. Deadline Pressure

### Construct
Time pressure created by contract expiry, political calendars, summits, votes, or operational windows.

### Columns

- `days_to_deadline`
  - integer days remaining until contract expiry
- `hours_to_deadline`
  - higher-resolution countdown for short contracts
- `days_since_last_major_event`
  - recency gap since the last major catalyst
- `scheduled_meeting_within_7d`
  - binary feature for upcoming official meeting
- `decision_window_indicator`
  - binary feature for known policy or military timing window
- `calendar_congestion_score`
  - number of relevant deadlines clustered in the next 7 days

### Cadence
Daily, hourly near expiry.

### Model use

- Bayesian update: limited
- Hazard model: primary
- Regime model: limited
- Tree model: yes

### Failure modes

- fake urgency from media countdowns
- deadlines that are politically irrelevant
- missing hidden timing constraints

---

## 7. Market Stress

### Construct
Information from price dynamics, volatility, and liquidity strain.

### Columns

- `market_prob`
  - latest market-implied probability
- `market_momentum_1d`
  - one-day probability change
- `market_momentum_7d`
  - seven-day probability change
- `market_volatility_7d`
  - volatility of recent price changes
- `order_flow_imbalance_1d`
  - yes-minus-no flow imbalance
- `liquidity_depth_score`
  - depth / ease of execution measure
- `spread_proxy`
  - slippage or spread proxy when direct spread is unavailable

### Cadence
Hourly or faster.

### Model use

- Bayesian update: yes
- Hazard model: yes
- Regime model: yes
- Tree model: yes
- Decision layer: primary

### Failure modes

- thin markets create false price moves
- whales distort price without broad information value
- missing flow data limits interpretation

---

## Recommended first implementation priority

If the system must stay simple while becoming real, implement these first:

1. `market_prob`
2. `market_momentum_1d`
3. `market_volatility_7d`
4. `rolling_sentiment`
5. `shock_event_count_3d`
6. `official_meeting_count_7d`
7. `oil_stress`
8. `days_to_deadline`
9. `order_flow_imbalance_1d`
10. `liquidity_depth_score`

That gives you a usable core without pretending you already measure everything perfectly.
