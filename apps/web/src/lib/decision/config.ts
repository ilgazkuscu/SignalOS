export const decisionConfig = {
  scoreWeights: {
    gapSize: 1,
    confidence: 1,
    catalystNearness: 1,
    liquidityQuality: 1,
    wordingRiskPenalty: 1,
  },
  thresholds: {
    trade: 0.11,
    watch: 0.055,
    minGapForDirectionalBias: 0.035,
    minimumEv: 0.025,
    maxHoldingHours: 96,
  },
  calibrationBuckets: [
    { key: "no_edge", min: 0, max: 0.055, label: "0-5.5%: no edge" },
    { key: "weak_edge", min: 0.055, max: 0.11, label: "5.5-11%: weak edge" },
    { key: "tradable", min: 0.11, max: 0.16, label: "11-16%: tradable" },
    { key: "high_conviction", min: 0.16, max: Number.POSITIVE_INFINITY, label: "16%+: high conviction" },
  ] as const,
  sizing: {
    full: 0.16,
    half: 0.11,
    small: 0.06,
  },
  lowLiquidityVolume: 20_000,
  healthyLiquidityVolume: 110_000,
  elevatedVolatility: 0.12,
};

export type DecisionConfig = typeof decisionConfig;
