# Correctness Review

## Reviewed
- Trade decision scoring
- EV ranking
- Backtest/calibration proxy
- Source clustering and source URL propagation
- Timeline summary generation
- Live fetch fallback behavior

## Fixes in this pass
- Centralized source URL/domain extraction to avoid UI/data mismatch.
- Added tests that preserve source links through clustering.
- Added benchmark scaffolding for critical transforms.

## Still heuristic
- Calibration outcomes are fixture-simulated.
- Liquidity quality is a volume/spread proxy.
- Signal clustering uses normalized titles/time windows, not semantic embeddings.
