# Portfolio

## Purpose

Avoid mistaking several correlated bucket bets for independent opportunities.

## Logic

The current portfolio layer groups active trades by theme and estimates a simple correlation proxy.

## Formulas

\[
\text{TotalRisk}
=
\sum_i \text{RiskUnit}_i
\]

## Limitations

- Current theme is fixed to `Iran`.
- Correlation proxy is heuristic.
- No real broker or exchange position integration yet.

## Next improvements

- persist active trades
- add market-family themes
- add correlation from historical price co-movement
