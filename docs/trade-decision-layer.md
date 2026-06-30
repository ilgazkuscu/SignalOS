# Trade Decision Layer

## Purpose

Convert a model-vs-market view into a decision surface:

- Trade
- Watch
- Do nothing

The goal is not to automate trading. The goal is to make the reasoning behind a directional decision inspectable and repeatable.

## Formula

\[
\text{TradeScore}
=
\text{GapSize}
\times
\text{Confidence}
\times
\text{CatalystNearness}
\times
\text{LiquidityQuality}
\times
(1-\text{WordingRiskPenalty})
\]

## Component definitions

- `GapSize`: normalized absolute difference between model probability and market price
- `Confidence`: current model confidence score
- `CatalystNearness`: proximity and quality of linked catalyst windows
- `LiquidityQuality`: simple volume/spread proxy
- `WordingRiskPenalty`: discount for unresolved resolution-language risk

## Thresholds

- `trade`: 0.11
- `watch`: 0.055
- `min directional gap`: 0.035

These live in `apps/web/src/lib/decision/config.ts`.

## Stance logic

- `LONG_YES`: model is meaningfully above market and trade score clears the trade threshold
- `LONG_NO`: model is meaningfully below market and trade score clears the trade threshold
- `WATCH`: directional gap exists, but risk or setup quality is not strong enough
- `NO_TRADE`: no meaningful edge or conditions are too poor

## Known limitations

- Current liquidity quality uses a simple proxy, not a full order book
- Catalyst nearness is partly inferred from fixture/live event structure
- Thresholds are heuristic and should be calibrated over time

## Future improvements

- realized PnL calibration
- bucket-specific thresholds
- order-book-aware liquidity measures
- volatility-adjusted trade scoring
