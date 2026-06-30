import { decisionConfig } from "@/lib/decision/config";
import type {
  BacktestTradeRecord,
  CalibrationSummary,
  MarketDefinition,
  MarketHistoryPoint,
  Signal,
  TradeDecision,
} from "@/lib/types/domain";

function scoreBucket(score: number): BacktestTradeRecord["scoreBucket"] {
  const bucket = decisionConfig.calibrationBuckets.find((item) => score >= item.min && score < item.max);
  return bucket?.key ?? "high_conviction";
}

function realizationFromFixture(marketId: string): BacktestTradeRecord["realizedOutcome"] {
  return marketId === "jun-30" || marketId === "may-31" ? "YES" : "NO";
}

function pnlProxy(decision: TradeDecision, marketProbability: number, realized: BacktestTradeRecord["realizedOutcome"]) {
  if (decision.stance !== "LONG_YES" && decision.stance !== "LONG_NO") return 0;
  if (realized === "UNRESOLVED_SIMULATED") return 0;
  const yesWins = realized === "YES";
  const longYes = decision.stance === "LONG_YES";
  if (longYes) return yesWins ? 1 - marketProbability : -marketProbability;
  return yesWins ? -(1 - marketProbability) : marketProbability;
}

export function runBacktest({
  markets,
  decisions,
  marketHistory,
  signals,
}: {
  markets: MarketDefinition[];
  decisions: TradeDecision[];
  marketHistory: MarketHistoryPoint[];
  signals: Signal[];
}): CalibrationSummary {
  const trades = decisions
    .filter((decision) => decision.stance === "LONG_YES" || decision.stance === "LONG_NO" || decision.stance === "WATCH")
    .map((decision) => {
      const latestMarket =
        marketHistory
          .filter((point) => point.marketId === decision.marketId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]?.yesPrice ?? 0.5;
      const market = markets.find((item) => item.id === decision.marketId);
      const linkedSignals = signals.filter((signal) => signal.status === "verified").slice(-5);
      const realizedOutcome = realizationFromFixture(decision.marketId);
      const predictedProbability =
        decision.edgeDirection === "no"
          ? 1 - latestMarket - Math.abs(decision.tradeScore) * 0.5
          : latestMarket + Math.abs(decision.tradeScore) * 0.5;

      return {
        id: `bt-${decision.marketId}`,
        marketId: decision.marketId,
        enteredAt: market?.deadlineAt ?? new Date().toISOString(),
        predictedProbability: Math.max(0.01, Math.min(0.99, predictedProbability)),
        marketProbabilityAtEntry: latestMarket,
        realizedOutcome,
        pnlProxy: pnlProxy(decision, latestMarket, realizedOutcome),
        tradeScore: decision.tradeScore,
        scoreBucket: scoreBucket(decision.tradeScore),
        signalFamilies: Array.from(new Set(linkedSignals.map((signal) => signal.family))),
        simulated: true,
      } satisfies BacktestTradeRecord;
    });

  const calibrationCurve = decisionConfig.calibrationBuckets.map((bucket) => {
    const bucketTrades = trades.filter((trade) => trade.scoreBucket === bucket.key);
    const realizedRate = bucketTrades.length
      ? bucketTrades.filter((trade) => trade.pnlProxy > 0).length / bucketTrades.length
      : 0;
    return {
      bucket: bucket.label,
      averagePredicted: bucketTrades.length
        ? bucketTrades.reduce((sum, trade) => sum + trade.predictedProbability, 0) / bucketTrades.length
        : 0,
      realizedRate,
      count: bucketTrades.length,
    };
  });

  const hitRateByScoreBucket = Object.fromEntries(
    decisionConfig.calibrationBuckets.map((bucket) => {
      const bucketTrades = trades.filter((trade) => trade.scoreBucket === bucket.key);
      return [bucket.key, bucketTrades.length ? bucketTrades.filter((trade) => trade.pnlProxy > 0).length / bucketTrades.length : 0];
    }),
  ) as CalibrationSummary["hitRateByScoreBucket"];

  const families = Array.from(new Set(trades.flatMap((trade) => trade.signalFamilies)));
  const hitRateBySignalFamily = families.map((family) => {
    const familyTrades = trades.filter((trade) => trade.signalFamilies.includes(family));
    return {
      family,
      hitRate: familyTrades.length ? familyTrades.filter((trade) => trade.pnlProxy > 0).length / familyTrades.length : 0,
      count: familyTrades.length,
    };
  });

  return {
    dataQuality: "fixture_simulated",
    calibrationCurve,
    averageEdgePerTrade: trades.length ? trades.reduce((sum, trade) => sum + trade.pnlProxy, 0) / trades.length : 0,
    hitRateByScoreBucket,
    hitRateBySignalFamily,
    trades,
    limitations: [
      "Outcome labels are simulated from fixture assumptions, not settled historical results.",
      "PnL proxy ignores slippage, fees, path dependency, and order book depth.",
      "Use this to test process and calibration plumbing, not to claim real historical edge.",
    ],
  };
}
