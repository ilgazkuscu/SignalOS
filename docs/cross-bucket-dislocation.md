# Cross-Bucket Dislocation

## Intuition

Prediction markets do not only express direction. They also express timing.

If the market is steep between two adjacent buckets and the model is flat, or vice versa, that mismatch can matter more than the absolute price of one contract.

## Formula

\[
\text{CurveDislocation}(T_1, T_2)
=
\big(P_{market}(T_2)-P_{market}(T_1)\big)
-
\big(P_{model}(T_2)-P_{model}(T_1)\big)
\]

## Interpretation guide

- positive dislocation: market curve is steeper than model curve
- negative dislocation: model curve is steeper than market curve
- near zero: timing structures are broadly aligned

## Sample scenarios

- Near bucket rich, far bucket cheap
- Far bucket rich because market assumes slow wording conversion
- Model flatter than market because it sees catalysts as near-term rather than back-loaded

## Limitations

- Uses adjacent-bucket comparisons only in the current implementation
- Does not yet use full implied hazard extraction
- Sensitive to stale or low-liquidity prices
