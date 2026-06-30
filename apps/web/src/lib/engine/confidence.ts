import type { ConfidenceLabel, DriverContribution, Signal } from "@/lib/types/domain";
import { clamp } from "@/lib/utils/math";

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  explanation: string[];
}

export function computeConfidence(
  signals: Signal[],
  drivers: DriverContribution[],
): ConfidenceResult {
  const activeSignals = signals.filter((signal) => signal.status !== "rejected");
  const avgSignalConfidence =
    activeSignals.reduce((sum, signal) => sum + signal.confidence, 0) / Math.max(activeSignals.length, 1);
  const contradictionLoad =
    drivers.reduce((sum, driver) => sum + driver.contradictionPenaltyApplied, 0) / Math.max(drivers.length, 1);
  const staleShare = drivers.filter((driver) => driver.stale).length / Math.max(drivers.length, 1);
  const officialShare =
    activeSignals.filter((signal) =>
      ["resolutionWording", "cabinetAlignment", "trumpTelemetry", "leaderSchedule"].includes(signal.family),
    ).length / Math.max(activeSignals.length, 1);
  const correlationLoad =
    drivers.reduce((sum, driver) => sum + driver.correlatedPenaltyApplied, 0) / Math.max(drivers.length, 1);

  // Weights: positive (0.40 + 0.26 = 0.66), penalties (0.16 + 0.11 + 0.07 = 0.34), total = 1.00
  const rawScore =
    avgSignalConfidence * 0.40 +
    officialShare * 0.26 -
    contradictionLoad * 0.16 -
    staleShare * 0.11 -
    correlationLoad * 0.07;
  const score = clamp(rawScore);
  const label: ConfidenceLabel = score >= 0.72 ? "high" : score >= 0.45 ? "medium" : "low";

  return {
    score,
    label,
    explanation: [
      `Average signal confidence is ${(avgSignalConfidence * 100).toFixed(0)}%.`,
      `Official or near-official evidence share is ${(officialShare * 100).toFixed(0)}%.`,
      `Contradiction pressure is ${(contradictionLoad * 100).toFixed(0)}%, and stale-signal share is ${(staleShare * 100).toFixed(0)}%.`,
      `Correlation down-weighting load is ${(correlationLoad * 100).toFixed(0)}%.`,
    ],
  };
}
