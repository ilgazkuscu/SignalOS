import type { PortfolioSummary, PositionSizingGuidance, TradeDecision } from "@/lib/types/domain";

const riskUnit = {
  FULL: 1,
  HALF: 0.5,
  SMALL: 0.25,
  AVOID: 0,
};

export function buildPortfolioSummary({
  decisions,
  sizingGuidance,
  nowIso,
}: {
  decisions: TradeDecision[];
  sizingGuidance: PositionSizingGuidance[];
  nowIso: string;
}): PortfolioSummary {
  const activeTrades = decisions
    .filter((decision) => decision.stance === "LONG_YES" || decision.stance === "LONG_NO")
    .map((decision) => {
      const sizing = sizingGuidance.find((item) => item.marketId === decision.marketId);
      return {
        marketId: decision.marketId,
        stance: decision.stance,
        notionalRiskUnit: riskUnit[sizing?.tier ?? "AVOID"],
        theme: "Iran" as const,
        openedAt: nowIso,
      };
    })
    .filter((trade) => trade.notionalRiskUnit > 0);

  const totalRisk = activeTrades.reduce((sum, trade) => sum + trade.notionalRiskUnit, 0);
  const exposureByTheme = [{ theme: "Iran" as const, exposure: totalRisk }];
  const correlationProxy = activeTrades.length > 1 ? 0.82 : activeTrades.length === 1 ? 0.35 : 0;

  return {
    activeTrades,
    exposureByTheme,
    correlationProxy,
    totalRisk,
    concentrationWarnings: [
      totalRisk > 1.5 ? "Concentration warning: multiple buckets share the same Iran resolution theme." : "Theme concentration is currently contained.",
      correlationProxy > 0.7 ? "Correlation proxy is high because bucket outcomes are not independent." : "Correlation proxy is moderate or low.",
    ],
  };
}
