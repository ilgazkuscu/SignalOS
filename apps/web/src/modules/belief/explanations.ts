import type {
  BeliefState,
  DriverContribution,
  Signal,
  SignalFamilyKey,
} from "@/lib/types/domain";

export function createDriverNarrative(
  signal: Signal,
  familyWeight: number,
  contribution: number,
  affects: DriverContribution["affects"],
): string {
  const affectsText = affects
    .map((item) =>
      item === "real_end"
        ? "real de-escalation"
        : item === "formal_announcement"
          ? "formal announcement odds"
          : "resolution friction",
    )
    .join(" and ");

  return `${signal.rationale} Weighted contribution ${contribution >= 0 ? "added" : "reduced"} ${Math.abs(contribution * 100).toFixed(1)} points after confidence, recency, and profile weighting. This primarily affects ${affectsText}. Family weight: ${familyWeight.toFixed(2)}.`;
}

export function splitDrivers(drivers: DriverContribution[]): Pick<
  BeliefState,
  "topPositiveDrivers" | "topNegativeDrivers" | "staleSignals"
> {
  const sorted = [...drivers].sort((a, b) => Math.abs(b.pointsDelta) - Math.abs(a.pointsDelta));

  return {
    topPositiveDrivers: sorted.filter((driver) => driver.pointsDelta > 0).slice(0, 5),
    topNegativeDrivers: sorted.filter((driver) => driver.pointsDelta < 0).slice(0, 5),
    staleSignals: sorted.filter((driver) => driver.stale).slice(0, 5),
  };
}

export function determineAffectedLatents(
  family: SignalFamilyKey,
): DriverContribution["affects"] {
  switch (family) {
    case "forcePosture":
    case "strategicFlights":
    case "diplomaticChannels":
    case "proxyTempo":
      return ["real_end"];
    case "leaderSchedule":
      return ["real_end", "formal_announcement"];
    case "resolutionWording":
    case "trumpTelemetry":
    case "cabinetAlignment":
      return ["formal_announcement", "resolution_friction"];
    case "marketMicrostructure":
    case "macroConfirmation":
    case "pizzaIndex":
    case "manualJudgment":
      return ["real_end", "formal_announcement"];
  }
}
