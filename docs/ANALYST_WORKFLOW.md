# Analyst Workflow

## Dashboard

Use the dashboard to answer:

- What does the model think for each bucket?
- Is the market overpricing peace vibes?
- Are official statements actually qualifying?
- Which bucket has the largest model-vs-market gap?
- Is wording risk or announcement hazard the main bottleneck?

## Signal Explorer

Use the explorer to inspect:

- raw source events
- normalized signals
- extraction method
- confidence
- candidate vs verified vs rejected status
- projected impact if a candidate were verified now
- correlation-linked and stale signals

The explorer now supports:

- family/source/direction/extraction/time-window filters
- text search
- confidence range filtering
- sort by newest, confidence, or impact
- degraded-mode badge if the signal API fails

## Scenario Lab

Use scenario lab to test:

- explicit end statement
- pause language only
- carrier drawdown
- proxy strike shock

The current scenario lab now shows:

- baseline vs scenario bucket deltas
- strongest shifted bucket
- real-end vs announcement vs friction deltas
- a short summary of which latent state moved most

## Replay

Use replay to audit:

- how the model evolved over time
- whether the market moved earlier or later than the model
- whether confidence rose for good reasons

The replay page now emphasizes:

- historical market YES overlay for each bucket
- signed model-vs-market gap over time
- time scrubber with play/pause and speed control
- annotation stream for major fixture events
- local replay window with the exact visible signals/events at that moment

This is the right page to answer:

- Did the market move before the model?
- Was the model early or late on wording-sensitive turns?
- Which signals were actually available at each timestamp?

## Admin

Use the weight profiles to compare:

- conservative
- balanced
- opportunistic

The recommended default is `balanced`.
