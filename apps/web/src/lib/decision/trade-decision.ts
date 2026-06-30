import type {
  BeliefState,
  CatalystEvent,
  MarketDefinition,
  MarketSnapshot,
  PositionSizingGuidance,
  ThesisCard,
  TradeDecision,
} from "@/lib/types/domain";
import { clamp, scaleRange } from "@/lib/utils/math";
import { decisionConfig } from "@/lib/decision/config";

function hoursUntil(targetIso: string, nowIso: string) {
  return (new Date(targetIso).getTime() - new Date(nowIso).getTime()) / 3_600_000;
}

function bucketCatalystNearness(market: MarketDefinition, catalysts: CatalystEvent[], nowIso: string) {
  const candidates = catalysts.filter((event) => event.linkedMarkets.includes(market.id));
  if (!candidates.length) return 0.35;
  const best = candidates
    .map((event) => {
      const hours = Math.max(0, hoursUntil(event.startAt, nowIso));
      const confidenceBoost = event.confidence === "confirmed" ? 0.15 : 0;
      const relevanceBoost = event.relevance === "high" ? 0.15 : 0.05;
      return clamp(1 - hours / 168 + confidenceBoost + relevanceBoost, 0.15, 1);
    })
    .sort((a, b) => b - a)[0];
  return best;
}

function liquidityQuality(snapshot: MarketSnapshot) {
  const volumeScore = scaleRange(
    snapshot.volume,
    decisionConfig.lowLiquidityVolume,
    decisionConfig.healthyLiquidityVolume,
    0.2,
    1,
  );
  const volatilityPenalty = snapshot.volatility > decisionConfig.elevatedVolatility ? 0.15 : 0;
  return clamp(volumeScore - volatilityPenalty, 0.1, 1);
}

export function buildTradeDecisions({
  markets,
  marketSnapshots,
  belief,
  catalystCalendar,
  theses,
}: {
  markets: MarketDefinition[];
  marketSnapshots: MarketSnapshot[];
  belief: BeliefState;
  catalystCalendar: CatalystEvent[];
  theses: ThesisCard[];
}): { decisions: TradeDecision[]; sizingGuidance: PositionSizingGuidance[] } {
  const decisions = markets.map((market) => {
    const snapshot = marketSnapshots.find((item) => item.marketId === market.id);
    if (market.marketStatus === "closed") {
      const resolved = market.resolvedOutcome ? market.resolvedOutcome.toUpperCase() : "settled";
      return {
        marketId: market.id,
        tradeScore: 0,
        stance: "NO_TRADE",
        rationale: [
          `Polymarket marks this contract closed${market.closedAt ? ` as of ${market.closedAt}` : ""}.`,
          `Resolved outcome: ${resolved}. Closed markets are excluded from active trade scoring.`,
        ],
        invalidation: ["Closed contracts cannot produce a new entry signal."],
        warnings: ["Resolved or closed market: archive only, no active execution."],
        components: {
          gapSize: 0,
          confidence: belief.confidenceScore,
          catalystNearness: 0,
          liquidityQuality: 0,
          wordingRiskPenalty: 1,
        },
        edgeDirection: "none",
      } satisfies TradeDecision;
    }
    const marketYes = snapshot?.yesPrice ?? 0.5;
    const modelYes = belief.yesProbabilityByContract[market.id];
    const gap = modelYes - marketYes;
    const gapSize = clamp(Math.abs(gap) / 0.25, 0, 1);
    const catalystNearness = bucketCatalystNearness(market, catalystCalendar, belief.asOf);
    const liquidity = snapshot ? liquidityQuality(snapshot) : 0.35;
    const wordingRiskPenalty = clamp(belief.wordingRiskScore * (1 - belief.decompositionByContract[market.id].frictionMultiplier));
    const components = {
      gapSize,
      confidence: belief.confidenceScore,
      catalystNearness,
      liquidityQuality: liquidity,
      wordingRiskPenalty,
    };
    const tradeScore =
      components.gapSize *
      components.confidence *
      components.catalystNearness *
      components.liquidityQuality *
      (1 - components.wordingRiskPenalty);

    const thesis = theses.find((item) => item.marketId === market.id);
    const edgeDirection = gap > decisionConfig.thresholds.minGapForDirectionalBias ? "yes" : gap < -decisionConfig.thresholds.minGapForDirectionalBias ? "no" : "none";
    const highRisk = wordingRiskPenalty > 0.35 || liquidity < 0.35;

    let stance: TradeDecision["stance"] = "NO_TRADE";
    if (edgeDirection !== "none" && tradeScore >= decisionConfig.thresholds.trade && !highRisk) {
      stance = edgeDirection === "yes" ? "LONG_YES" : "LONG_NO";
    } else if (edgeDirection !== "none" && tradeScore >= decisionConfig.thresholds.watch) {
      stance = "WATCH";
    }

    const rationale = [
      `Model-market gap is ${(gap * 100).toFixed(1)} points with ${belief.confidenceLabel} confidence.`,
      `Catalyst nearness scores ${(catalystNearness * 100).toFixed(0)}%, based on linked deadlines and likely event windows.`,
      `Liquidity quality scores ${(liquidity * 100).toFixed(0)}% from current volume and spread proxies.`,
    ];
    if (edgeDirection === "yes") {
      rationale.unshift("Model probability is above market pricing, so the directional edge points toward YES.");
    } else if (edgeDirection === "no") {
      rationale.unshift("Model probability is below market pricing, so the directional edge points toward NO.");
    } else {
      rationale.unshift("Gap is too small for a directional call even before risk filters.");
    }

    const invalidation = [
      thesis?.invalidation ?? "A strong contradictory official signal would invalidate the current edge.",
      gap > 0
        ? "A fresh re-escalation event or explicit readiness language would weaken the YES case."
        : "A credible explicit end-language statement would invalidate the NO lean quickly.",
    ];

    const warnings = [
      wordingRiskPenalty > 0.35 ? "High wording risk: de-escalation may still fail to convert into settlement language." : "Wording risk is manageable but still material.",
      liquidity < 0.4 ? "Low liquidity / wide spread proxy: edge may be hard to monetize cleanly." : "Liquidity looks serviceable for a tactical decision.",
    ];

    return {
      marketId: market.id,
      tradeScore,
      stance,
      rationale,
      invalidation,
      warnings,
      components,
      edgeDirection,
    } satisfies TradeDecision;
  });

  const sizingGuidance = decisions.map((decision) => {
    const wordingRisk = decision.components.wordingRiskPenalty;
    let tier: PositionSizingGuidance["tier"] = "AVOID";
    if (decision.stance === "WATCH" || decision.stance === "NO_TRADE") {
      tier = "AVOID";
    } else if (decision.tradeScore >= decisionConfig.sizing.full && wordingRisk < 0.22) {
      tier = "FULL";
    } else if (decision.tradeScore >= decisionConfig.sizing.half) {
      tier = "HALF";
    } else if (decision.tradeScore >= decisionConfig.sizing.small) {
      tier = "SMALL";
    }

    return {
      marketId: decision.marketId,
      tier,
      rationale: [
        `Trade score is ${(decision.tradeScore * 100).toFixed(1)}%.`,
        wordingRisk > 0.3 ? "Reduce size because wording risk remains elevated." : "Wording risk is not the main limiter here.",
        decision.components.catalystNearness < 0.45 ? "Catalyst timing is still soft, so size should stay disciplined." : "Near catalyst window supports taking exposure more seriously.",
      ],
      disclaimer: "Internal sizing guidance only. Not investment advice.",
    } satisfies PositionSizingGuidance;
  });

  return { decisions, sizingGuidance };
}
