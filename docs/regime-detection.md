# Regime Detection

## Purpose

Adjust confidence, thresholds, and sizing when market conditions change.

## Logic

The first-pass detector identifies:

- high volatility
- low liquidity
- pre-event
- headline-driven
- balanced

## Formulas

The detector uses simple thresholds on:

- average volatility/spread proxy
- average volume
- hours to next catalyst
- recent headline density

## Limitations

- Thresholds are heuristic.
- No learned regime model yet.

## Next improvements

- backtest regime-specific edge
- infer regimes from realized volatility
- add post-event decay state
