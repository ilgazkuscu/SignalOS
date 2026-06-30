import type { CrossBucketDislocation, MarketDefinition, MarketSnapshot } from "@/lib/types/domain";

export function buildCrossBucketDislocations({
  markets,
  marketSnapshots,
  modelYesByContract,
}: {
  markets: MarketDefinition[];
  marketSnapshots: MarketSnapshot[];
  modelYesByContract: Record<string, number>;
}): CrossBucketDislocation[] {
  const ordered = markets
    .filter((market) => market.marketStatus !== "closed")
    .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt));
  const rows: CrossBucketDislocation[] = [];

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const near = ordered[index];
    const far = ordered[index + 1];
    const nearMarket = marketSnapshots.find((item) => item.marketId === near.id)?.yesPrice ?? 0;
    const farMarket = marketSnapshots.find((item) => item.marketId === far.id)?.yesPrice ?? 0;
    const nearModel = modelYesByContract[near.id] ?? 0;
    const farModel = modelYesByContract[far.id] ?? 0;
    const marketCurveMove = farMarket - nearMarket;
    const modelCurveMove = farModel - nearModel;
    const curveDislocation = marketCurveMove - modelCurveMove;

    rows.push({
      nearMarketId: near.id,
      farMarketId: far.id,
      marketCurveMove,
      modelCurveMove,
      curveDislocation,
      steepnessDelta: Math.abs(curveDislocation),
      interpretation:
        curveDislocation > 0.05
          ? "Market timing curve is steeper than the model. Near bucket looks rich or later bucket looks cheap."
          : curveDislocation < -0.05
            ? "Model timing curve is steeper than the market. Later bucket may be overpriced relative to the near bucket."
            : "Market and model timing curves are broadly aligned.",
      strongest: false,
    });
  }

  const strongestIndex = rows.reduce(
    (best, row, index) => (Math.abs(row.curveDislocation) > Math.abs(rows[best]?.curveDislocation ?? -1) ? index : best),
    0,
  );
  if (rows[strongestIndex]) rows[strongestIndex].strongest = true;

  return rows;
}
