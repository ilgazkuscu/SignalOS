# Execution Rules

## Purpose

Separate “interesting edge” from “tradable edge.”

## Logic

Entry requires:

- EV above threshold
- catalyst inside the tactical window
- liquidity acceptable
- directional stance is `LONG_YES` or `LONG_NO`

Exit triggers:

- edge collapses
- catalyst has passed and position is stale
- wording risk becomes too high

## Formulas

\[
\text{Enter}
=
EV > EV_{min}
\land \text{CatalystWindow}
\land \text{LiquidityOK}
\land \text{DirectionalStance}
\]

## Limitations

- Holding time is inferred from catalyst timing, not stored trade timestamps.
- Liquidity is currently a volume/spread proxy.

## Next improvements

- persist real entries/exits
- add execution logs
- add bucket-specific thresholds
