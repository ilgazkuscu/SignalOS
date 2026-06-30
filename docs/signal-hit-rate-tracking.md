# Signal Hit-Rate Tracking

## Logging schema

The first-pass tracker uses:

- signal family
- signal timestamp
- direction
- subsequent market move
- short-horizon and medium-horizon follow-through

## Metric definitions

- `totalFirings`
- `usefulMoveRate`
- `averagePostSignalMove`
- `resolutionAlignmentRate`
- `hitRateByHorizon.short`
- `hitRateByHorizon.medium`

## Methodology

For each signal:

1. find the latest market price before the signal
2. measure market movement after the signal
3. compare move direction to expected signal direction
4. aggregate by family

## Caveats

- sample sizes are often small
- current logic uses fixture/live market history, not trade logs
- this is descriptive quality tracking, not a statistically mature alpha estimator
