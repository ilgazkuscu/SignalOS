import { decisionConfig } from "@/lib/decision/config";
import type { CatalystEvent, ExecutionRuleOutput, ExpectedValueEstimate, TradeDecision } from "@/lib/types/domain";

export function buildExecutionRules({
  decisions,
  expectedValues,
  catalysts,
  nowIso,
}: {
  decisions: TradeDecision[];
  expectedValues: ExpectedValueEstimate[];
  catalysts: CatalystEvent[];
  nowIso: string;
}): ExecutionRuleOutput[] {
  return decisions.map((decision) => {
    const ev = expectedValues.find((item) => item.marketId === decision.marketId)?.evPerUnit ?? 0;
    const linkedCatalysts = catalysts.filter((event) => event.linkedMarkets.includes(decision.marketId));
    const nextCatalyst = linkedCatalysts.sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
    const hoursToCatalyst = nextCatalyst
      ? (new Date(nextCatalyst.startAt).getTime() - new Date(nowIso).getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY;
    const catalystWithinWindow = hoursToCatalyst >= -12 && hoursToCatalyst <= 168;
    const liquidityAcceptable = decision.components.liquidityQuality >= 0.35;
    const enter =
      ev > decisionConfig.thresholds.minimumEv &&
      catalystWithinWindow &&
      liquidityAcceptable &&
      (decision.stance === "LONG_YES" || decision.stance === "LONG_NO");
    const holdingTimeHours = nextCatalyst ? Math.max(0, -hoursToCatalyst) : 0;
    const stale = holdingTimeHours > decisionConfig.thresholds.maxHoldingHours || (!catalystWithinWindow && decision.stance === "WATCH");
    const exit = stale || ev <= 0 || decision.components.wordingRiskPenalty > 0.5;

    return {
      marketId: decision.marketId,
      enter,
      exit,
      stale,
      holdingTimeHours,
      rules: [
        enter ? "Entry rule passes: EV, catalyst window, stance, and liquidity all clear." : "Entry rule does not pass under current thresholds.",
        exit ? "Exit/watch downgrade rule triggered by stale edge, collapsed EV, or elevated wording risk." : "No exit rule currently triggered.",
        catalystWithinWindow ? "Catalyst is inside the tactical window." : "No near catalyst window; avoid forcing a trade.",
      ],
    } satisfies ExecutionRuleOutput;
  });
}
