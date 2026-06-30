import type { ExpectedValueEstimate, MarketDefinition, MarketSnapshot, TradeDecision } from "@/lib/types/domain";
import { decisionConfig } from "@/lib/decision/config";

export function buildExpectedValueRanking({
  markets,
  marketSnapshots,
  decisions,
}: {
  markets: MarketDefinition[];
  marketSnapshots: MarketSnapshot[];
  decisions: TradeDecision[];
}): ExpectedValueEstimate[] {
  return decisions
    .map((decision) => {
      const market = markets.find((item) => item.id === decision.marketId);
      if (market?.marketStatus === "closed") {
        return {
          marketId: decision.marketId,
          evPerUnit: 0,
          riskAdjustment: 1,
          payoutMultiple: 0,
          rank: 0,
          interpretation: `${market.label} is closed or resolved on Polymarket, so it is excluded from EV ranking.`,
        } satisfies ExpectedValueEstimate;
      }
      const marketYes = marketSnapshots.find((snapshot) => snapshot.marketId === decision.marketId)?.yesPrice ?? 0.5;
      const modelEdge = decision.edgeDirection === "no" ? -decision.components.gapSize * 0.25 : decision.components.gapSize * 0.25;
      const price = decision.edgeDirection === "no" ? 1 - marketYes : marketYes;
      const safePrice = Math.max(price, 0.001); // Prevent division by zero
      const payoutMultiple = (1 - safePrice) / safePrice;
      const riskAdjustment = decision.components.wordingRiskPenalty * 0.08 + (1 - decision.components.liquidityQuality) * 0.04;
      const evPerUnit = Number.isFinite(Math.abs(modelEdge) * payoutMultiple - riskAdjustment)
        ? Math.abs(modelEdge) * payoutMultiple - riskAdjustment
        : 0;
      const label = market?.label ?? decision.marketId;
      return {
        marketId: decision.marketId,
        evPerUnit,
        riskAdjustment,
        payoutMultiple,
        rank: 0,
        interpretation:
          evPerUnit > decisionConfig.thresholds.minimumEv
            ? `${label} clears the EV threshold after wording and liquidity risk.`
            : `${label} does not clear the EV threshold; treat as watch/no-trade unless new catalyst arrives.`,
      } satisfies ExpectedValueEstimate;
    })
    .sort((a, b) => b.evPerUnit - a.evPerUnit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
