# B-2 Tracker

## Purpose

This tracker is for estimating whether current open-source evidence is consistent with meaningful B-2 operational activity.

It does **not** prove mission intent.
It does **not** prove strike authorization.
It is an OSINT confidence worksheet.

Use it to convert weak, partial observations into a disciplined model input.

## Rule

Never treat one signal as decisive.

Track four things separately:

1. direct reports
2. tanker activity
3. base activity
4. corroboration

Then combine them into a single `b2_presence_score`.

## Scoring Rubric

### 1. Direct Reports

This means:

- visual sightings
- credible aviation OSINT reports
- flight-tracking hints plausibly tied to B-2 activity

Score:

- `0.0` = no evidence
- `0.2` = weak rumor / one low-quality mention
- `0.4` = one plausible but unconfirmed report
- `0.6` = multiple plausible mentions
- `0.8` = strong credible report or repeated sightings
- `1.0` = highly corroborated direct visibility

### 2. Tanker Activity

This means:

- KC-135 / KC-46 anomalies
- tanker bridges
- unusual refueling patterns
- support behavior consistent with long-range strike posture

Score:

- `0.0` = normal
- `0.2` = mildly unusual
- `0.4` = elevated
- `0.6` = clearly unusual
- `0.8` = major support surge
- `1.0` = extreme support pattern strongly consistent with major operation

### 3. Base Activity

This means:

- unusual activity at known B-2 bases
- unusual runway tempo
- shelter / ramp / support equipment changes
- unusual staging behavior

Score:

- `0.0` = routine
- `0.2` = slightly elevated
- `0.4` = notable activity
- `0.6` = unusual tempo
- `0.8` = major anomaly
- `1.0` = exceptional base activity strongly suggesting operational movement

### 4. Corroboration

This measures:

- how many independent signals support the same interpretation
- whether the evidence is cross-confirmed across different source types

Score:

- `0.0` = nothing corroborates anything
- `0.2` = one source only
- `0.4` = two weakly independent hints
- `0.6` = multiple independent clues
- `0.8` = strong cross-source agreement
- `1.0` = very strong corroboration across source types

## Combined Score

Use:

```text
b2_presence_score =
  0.30 * direct_reports +
  0.35 * tanker_activity +
  0.20 * base_activity +
  0.15 * corroboration
```

This weights tanker support slightly more than direct reports because the bomber itself may stay hidden while support infrastructure becomes visible.

## Confidence Label

Convert `b2_presence_score` into:

- `0.00 - 0.24` -> `low`
- `0.25 - 0.49` -> `watch`
- `0.50 - 0.69` -> `elevated`
- `0.70 - 1.00` -> `high`

## Daily Worksheet

Fill this out once per session:

```text
Date:
Region:
Analyst:

Direct reports:
Score:
Why:

Tanker activity:
Score:
Why:

Base activity:
Score:
Why:

Corroboration:
Score:
Why:

Computed b2_presence_score:
Confidence label:

What this DOES support:
What this DOES NOT prove:
Main alternative explanation:
Next thing to watch:
```

## Example

```text
Date: 2026-04-12
Region: Central Command / long-range strike watch
Analyst: ops

Direct reports:
One plausible but unconfirmed B-2-related sighting report.
Score: 0.4
Why:
Useful, but still weak alone.

Tanker activity:
Large unusual tanker clustering consistent with long-range support.
Score: 0.8
Why:
This is the strongest observable change.

Base activity:
Elevated but not extreme base-side anomaly.
Score: 0.5
Why:
Something is moving, but not definitive.

Corroboration:
Several hints, but not enough for high confidence.
Score: 0.6
Why:
Signals point in the same direction.

Computed b2_presence_score:
0.30*0.4 + 0.35*0.8 + 0.20*0.5 + 0.15*0.6
= 0.12 + 0.28 + 0.10 + 0.09
= 0.59

Confidence label:
elevated

What this DOES support:
Meaningful evidence consistent with unusual bomber-support posture.

What this DOES NOT prove:
Actual strike order, mission launch, or target selection.

Main alternative explanation:
Exercise or deterrent signaling posture.

Next thing to watch:
Whether tanker tempo persists and whether further independent confirmation appears.
```

## How To Use In Your Model

Use `b2_presence_score` as a sub-input, not as the whole model.

Recommended mapping:

- if score is low, it should barely move anything
- if score is elevated/high, it should raise `force_posture_signal` or `strike_readiness_signal`

Example:

```text
force_posture_signal =
  0.55 * b2_presence_score +
  0.45 * tanker_activity
```

Or, if you want a directional input:

```text
real_deescalation_adjustment = -0.35 * b2_presence_score
```

Meaning:

- stronger B-2 presence lowers confidence in near-term de-escalation
- but it still should not dominate the whole model by itself

## Operator Warnings

1. No single tweet should move this score much.
2. Missing public visibility is not evidence of absence.
3. Tanker activity may reflect exercises, deterrence, or repositioning.
4. Use the score as one part of force-posture analysis, not a stand-alone war forecast.
