import type { MarketHistoryPoint, Signal, SignalFamilyMetrics, SignalFamilyKey } from "@/lib/types/domain";

const horizons = {
  short: 24 * 3_600_000,
  medium: 72 * 3_600_000,
};

function findMarketAtOrAfter(history: MarketHistoryPoint[], marketId: string, timestamp: string, horizonMs: number) {
  const start = new Date(timestamp).getTime();
  return history
    .filter((point) => point.marketId === marketId && new Date(point.timestamp).getTime() >= start && new Date(point.timestamp).getTime() <= start + horizonMs)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .at(-1);
}

export function buildSignalHitRateMetrics({
  signals,
  marketHistory,
}: {
  signals: Signal[];
  marketHistory: MarketHistoryPoint[];
}): SignalFamilyMetrics[] {
  const families = Array.from(new Set(signals.map((signal) => signal.family))) as SignalFamilyKey[];
  return families.map((family) => {
    const familySignals = signals.filter((signal) => signal.family === family && signal.status !== "rejected");
    const sourceLabels = Array.from(new Set(familySignals.map((signal) => signal.sourceId))).slice(0, 5);
    let useful = 0;
    let totalMove = 0;
    let resolutionAligned = 0;
    let shortHits = 0;
    let mediumHits = 0;

    for (const signal of familySignals) {
      const marketId = (signal.rawPayload.marketId as string | undefined) ?? "apr-21";
      const base = marketHistory
        .filter((point) => point.marketId === marketId && point.timestamp <= signal.occurredAt)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .at(-1);
      const shortPoint = findMarketAtOrAfter(marketHistory, marketId, signal.occurredAt, horizons.short);
      const mediumPoint = findMarketAtOrAfter(marketHistory, marketId, signal.occurredAt, horizons.medium);
      if (!base || !shortPoint || !mediumPoint) continue;

      const shortMove = shortPoint.yesPrice - base.yesPrice;
      const mediumMove = mediumPoint.yesPrice - base.yesPrice;
      const expectedSign = signal.direction === "pro_yes" ? 1 : signal.direction === "pro_no" ? -1 : 0;
      const alignedShort = expectedSign === 0 ? false : Math.sign(shortMove) === expectedSign;
      const alignedMedium = expectedSign === 0 ? false : Math.sign(mediumMove) === expectedSign;
      if (alignedShort || alignedMedium) useful += 1;
      if (alignedShort) shortHits += 1;
      if (alignedMedium) mediumHits += 1;
      if (Math.abs(mediumMove) > 0.025 && alignedMedium) resolutionAligned += 1;
      totalMove += mediumMove;
    }

    const totalFirings = familySignals.length;
    return {
      family,
      totalFirings,
      usefulMoveRate: totalFirings ? useful / totalFirings : 0,
      averagePostSignalMove: totalFirings ? totalMove / totalFirings : 0,
      resolutionAlignmentRate: totalFirings ? resolutionAligned / totalFirings : 0,
      sourceLabels,
      evidenceNote: sourceLabels.length
        ? `Derived from ${sourceLabels.join(", ")} signal observations and fixture/live market history.`
        : "No source-backed observations available for this family.",
      hitRateByHorizon: {
        short: totalFirings ? shortHits / totalFirings : 0,
        medium: totalFirings ? mediumHits / totalFirings : 0,
      },
      sampleSizeWarning: totalFirings < 3 ? "Small sample size. Treat this as directional, not calibrated." : undefined,
    } satisfies SignalFamilyMetrics;
  });
}
