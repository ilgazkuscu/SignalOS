# Backtesting

## Purpose

Replay historical or simulated signal states and ask whether the decision engine would have produced useful trades.

## Logic

The backtest engine consumes current decisions, fixture/live market history, and signal families. It creates synthetic trade records when true settled outcomes are unavailable.

## Formulas

For a long YES proxy:

\[
\text{PnLProxy}
=
\begin{cases}
1 - P_{market}, & \text{if YES wins}\\
-P_{market}, & \text{if NO wins}
\end{cases}
\]

For a long NO proxy:

\[
\text{PnLProxy}
=
\begin{cases}
-(1 - P_{market}), & \text{if YES wins}\\
P_{market}, & \text{if NO wins}
\end{cases}
\]

## Limitations

- Uses fixture-simulated outcomes today.
- Does not yet model execution path, exit timing, or partial fills.

## Next improvements

- store real trade snapshots
- ingest real historical price history
- replay decisions exactly as-of historical timestamps
