import type { CatalystEvent, MarketSnapshot, RegimeState, SourceEvent } from "@/lib/types/domain";

export function detectRegime({
  marketSnapshots,
  catalysts,
  sourceEvents,
  nowIso,
}: {
  marketSnapshots: MarketSnapshot[];
  catalysts: CatalystEvent[];
  sourceEvents: SourceEvent[];
  nowIso: string;
}): RegimeState {
  if (marketSnapshots.length === 0) {
    return { label: "balanced", confidenceAdjustment: 0, thresholdAdjustment: 0, sizingAdjustment: 0, rationale: ["No market snapshots available. Defaulting to balanced regime."] };
  }

  const avgVolatility = marketSnapshots.reduce((sum, snapshot) => sum + (Number.isFinite(snapshot.volatility) ? snapshot.volatility : 0), 0) / marketSnapshots.length;
  const avgVolume = marketSnapshots.reduce((sum, snapshot) => sum + (Number.isFinite(snapshot.volume) ? snapshot.volume : 0), 0) / marketSnapshots.length;
  const catalystHours = catalysts.map((event) => (new Date(event.startAt).getTime() - new Date(nowIso).getTime()) / 3_600_000);
  const nextCatalystHours = catalystHours.length > 0 ? Math.min(...catalystHours) : Infinity;
  const recentHeadlineCount = sourceEvents.filter(
    (event) => new Date(nowIso).getTime() - new Date(event.occurredAt).getTime() <= 24 * 3_600_000,
  ).length;

  if (avgVolatility > 0.12) {
    return { label: "high_volatility", confidenceAdjustment: -0.08, thresholdAdjustment: 0.03, sizingAdjustment: -0.25, rationale: ["Average spread/volatility proxy is elevated. Demand larger edge and reduce size."] };
  }
  if (avgVolume < 30_000) {
    return { label: "low_liquidity", confidenceAdjustment: -0.06, thresholdAdjustment: 0.025, sizingAdjustment: -0.3, rationale: ["Average volume is thin. Execution quality can dominate model edge."] };
  }
  if (nextCatalystHours >= 0 && nextCatalystHours <= 36) {
    return { label: "pre_event", confidenceAdjustment: 0.03, thresholdAdjustment: -0.01, sizingAdjustment: 0.1, rationale: ["A catalyst window is near. Timing edge matters more than long-run base rate."] };
  }
  if (recentHeadlineCount >= 8) {
    return { label: "headline_driven", confidenceAdjustment: -0.02, thresholdAdjustment: 0.015, sizingAdjustment: -0.1, rationale: ["Headline density is high. Expect fast repricing and more false positives."] };
  }
  return { label: "balanced", confidenceAdjustment: 0, thresholdAdjustment: 0, sizingAdjustment: 0, rationale: ["No extreme regime detected. Use base thresholds."] };
}
