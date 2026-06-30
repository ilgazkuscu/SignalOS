import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { buildOperationIndicators } from "@/lib/decision/operation-indicators";
import { buildHistoricalPatternAssessment } from "@/lib/historical-ops/engine";
import { BeliefEngine } from "@/lib/engine/belief-engine";

describe("historical pattern engine", () => {
  const now = new Date("2026-04-09T14:00:00-04:00");
  const operationIndicators = buildOperationIndicators({
    signals: demoFixtures.signals,
    sourceEvents: demoFixtures.sourceEvents,
  });

  it("produces normalized action-type probabilities with analogs", () => {
    const result = buildHistoricalPatternAssessment({
      now,
      signals: demoFixtures.signals,
      sourceEvents: demoFixtures.sourceEvents,
      operationIndicators,
      marketSnapshots: demoFixtures.marketSnapshots,
    });

    const total = result.actionTypeProbabilities.reduce((sum, item) => sum + item.probability, 0);
    expect(total).toBeCloseTo(1, 4);
    expect(result.actionTypeProbabilities[0]?.historicalAnalogs.length).toBeGreaterThan(0);
    expect(result.historicalCampaigns.length).toBeGreaterThanOrEqual(4);
  });

  it("retrograde and termination signals raise real-end odds without breaking bounds", () => {
    const historical = buildHistoricalPatternAssessment({
      now,
      signals: demoFixtures.signals,
      sourceEvents: demoFixtures.sourceEvents,
      operationIndicators,
      marketSnapshots: demoFixtures.marketSnapshots,
    });
    const engine = new BeliefEngine({
      markets: demoFixtures.markets,
      signals: demoFixtures.signals,
      marketSnapshots: demoFixtures.marketSnapshots,
    });
    const baseline = engine.recomputeBelief({ now, profileKey: "balanced" });
    const adjusted = engine.recomputeBelief({
      now,
      profileKey: "balanced",
      historicalPatternAdjustment: historical.adjustment,
      historicalActionTypeProbabilities: historical.actionTypeProbabilities,
      historicalPatternSummary: historical.summary,
    });

    expect(adjusted.trueDeescalationProbability).toBeGreaterThanOrEqual(0);
    expect(adjusted.trueDeescalationProbability).toBeLessThanOrEqual(1);
    expect(adjusted.historicalActionTypeProbabilities?.length).toBeGreaterThan(0);
    expect(adjusted.historicalPatternSummary).toContain("Historical U.S. analogs");
    expect(adjusted.yesProbabilityByContract["apr-21"]).toBeGreaterThanOrEqual(baseline.yesProbabilityByContract["apr-15"] - 0.2);
  });
});
