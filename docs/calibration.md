# Calibration

## Purpose

Calibration measures whether model confidence maps to realized outcomes. A system that looks smart but is not calibrated will size badly and overtrade.

## Logic

The current engine builds a fixture-backed calibration summary from simulated trade records. It logs:

- predicted probability
- market probability at entry
- realized outcome label
- PnL proxy
- trade score bucket
- linked signal families

## Formulas

\[
\text{AverageEdge}
=
\frac{1}{N}\sum_i \text{PnLProxy}_i
\]

\[
\text{HitRate}_{bucket}
=
\frac{\text{Winning trades in bucket}}{\text{Total trades in bucket}}
\]

## Limitations

- Current outcome labels are simulated from fixture assumptions.
- PnL proxy ignores fees, slippage, order-book depth, and path dependency.
- This is plumbing for calibration, not proof of real historical edge.

## Next improvements

- persist real decisions
- attach real resolution outcomes
- compare EV vs realized PnL
- calibrate thresholds from empirical close rates
