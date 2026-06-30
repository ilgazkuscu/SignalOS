# Scoring Model

## Prior

The prior generator builds a curve by date bucket using:

- deadline distance
- active hostilities estimate
- ceasefire status
- tendency toward formal vs quiet wind-down
- assumed baseline conflict duration

## Dynamic Update

For each signal:

1. choose family weight from the active profile
2. apply source confidence
3. apply recency decay
4. apply contradiction penalty if relevant
5. apply correlation penalty for repeated clustered signals
6. route the resulting contribution into one or more latent states

## Latent Routing

- force posture, flights, diplomacy, proxy tempo: mostly `real_end`
- wording, Trump telemetry, cabinet alignment: mostly `formal_announcement` and `resolution_friction`
- market, macro, pizza, manual judgment: blended / lighter impact

## Resolution Friction

This is the core adjustment that prevents the engine from confusing real de-escalation with a qualifying public statement.

High friction means:

- forces may be winding down
- rhetoric may be softer
- but the public language still fails the contract wording test

## Confidence

Confidence depends on:

- average signal confidence
- share of official or near-official evidence
- contradiction load
- stale-signal share
- correlation down-weighting load

The UI reports both numeric score and `low/medium/high`.

## Additional Derived Diagnostics

The current implementation also exposes:

- `wordingRiskScore`
- `marketDislocationScore`
- `dailyAnnouncementHazard`
- `dailyRealDeescalationHazard`

These are used in the dashboard, scenario lab, and replay surfaces to make the model easier to interpret operationally.

## Candidate Projected Impact

Candidate projected impact uses the same engine path as the live model:

1. take the current verified baseline
2. promote one candidate signal to `verified`
3. recompute the full belief state
4. compare the promoted state to the baseline

This yields signed deltas for:

- `trueDeescalationProbability`
- `formalAnnouncementProbability`
- `conditionalAnnouncementGivenEndProbability`
- `resolutionFrictionScore`
- contract YES by every bucket

The dashboard and Signal Explorer use this to answer whether a candidate mostly affects:

- real de-escalation
- wording qualification
- both
# Scoring Model

## Contract Probability Calculation

For each date bucket, the model displays:

```text
P(YES by T) =
  P(real_end by T)
  × P(qualifying announcement | real_end)
  × friction multiplier
```

The three terms mean:

- `P(real_end by T)`: whether operations have actually wound down by that deadline. This starts with the prior curve and updates from force posture, flights, diplomacy, proxy tempo, and similar signals.
- `P(qualifying announcement | real_end)`: assuming the real-world end happens, whether official enough language appears before the deadline. This updates most strongly from Trump/admin statements and the statement classifier.
- `friction multiplier`: a discount for the gap between reality and market-resolution language. Ambiguous words like `pause` keep friction high; explicit language like `operations have concluded` lowers friction.

The engine also applies guardrails:

- probabilities are clamped to valid 0-1 ranges;
- date buckets are monotone, so a later deadline cannot be lower than an earlier deadline;
- strong explicit wording catalysts can lift the displayed bucket probability above the plain raw product;
- model notes and the Model page now disclose when this can happen.

These outputs are structured scoring estimates, not a claim of perfect Bayesian inference.
