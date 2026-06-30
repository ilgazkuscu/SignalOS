# Historical U.S. Operations Pattern Engine

This module adds a theory-led layer for the Iran operations endgame market.

## What it does

Instead of treating flights, tankers, shipping, and military posture as generic dynamic signals, the engine maps them into recurring U.S. action types:

- `initiation`
- `escalation`
- `sustainment`
- `operational_pause`
- `coercive_settlement`
- `genuine_termination`
- `retrograde_with_cover`
- `withdrawal_without_termination`

The output is used as a bounded overlay on the existing belief engine:

- action types mostly move `real_end`
- coercive settlement and genuine termination slightly help `formal_announcement`
- retrograde or withdrawal without full termination can raise `friction`

## Why this exists

Think-tank conflict forecasting usually relies on interpretable event families, structural controls, and recurring historical patterns rather than opaque dynamic blends. Open-source aviation and maritime evidence is useful, but mainly as evidence of logistics, sustainment, readiness, and retrograde mechanics.

This layer encodes that logic directly.

## Historical precedents encoded

- Desert Shield / Desert Storm
- Kosovo / Allied Force
- Iraq drawdown / New Dawn
- Afghanistan retrograde

These are represented as phased patterns rather than full-resolution historical datasets. The current implementation is fixture-backed and deterministic, designed to be extended with richer weekly campaign panels later.

## ARIMAX-style design

Each action type has:

- an intercept
- lag weights for 1, 2, 4, and 8 week windows
- exogenous variables covering aviation, maritime, diplomacy, combat posture, and structural controls

This is intentionally “ARIMAX-style” rather than a statistically fit production ARIMAX model. The repo now has the feature contract and scoring path needed to swap in empirically fit coefficients later.

## Source backbone

- ACLED CAST methodology
- PaCE methodology
- Joint doctrine 3-0 series
- Joint planning doctrine (JP 5-0)
- NATO Allied Force history
- Afghanistan retrograde updates from CENTCOM / DoD
- C4ADS and Bellingcat for open-data aviation and maritime caution

## Current limitations

- campaign panels are still hand-encoded
- exogenous coefficients are theory-led defaults, not fit on a historical panel yet
- ADS-B / AIS remain corroborating evidence, not standalone proof
- the engine is optimized for the Iran endgame market, not all theaters
