# Performance Tracking

## Purpose

Measure whether the decision system improves over time.

## Logic

The current system tracks:

- calibration curve
- average edge per trade
- hit rate by score bucket
- hit rate by signal family
- EV vs simulated outcome proxy

## Formulas

\[
\text{SignalHitRate}_f
=
\frac{\text{Useful moves after family } f}{\text{Total uses of family } f}
\]

## Limitations

- Current output is fixture/simulation-backed.
- No realized trade log persistence yet.

## Next improvements

- append real decision snapshots
- generate trade reports after exits
- compare expected value to realized PnL
