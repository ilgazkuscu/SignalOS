import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { BeliefEngine } from "@/modules/belief";
import { computeConfidence } from "@/modules/belief";
import { detectRegime } from "@/lib/regime/regime-detection";
import { buildExpectedValueRanking } from "@/lib/edge/expected-value";
import type { DriverContribution, Signal } from "@/lib/types/domain";

const engine = new BeliefEngine({
  markets: demoFixtures.markets,
  signals: demoFixtures.signals,
  marketSnapshots: demoFixtures.marketSnapshots,
});

const baseOptions = {
  now: new Date("2026-04-09T14:00:00-04:00"),
  profileKey: "balanced" as const,
};

describe("probability invariants", () => {
  it("YES + NO = 1.0 for every contract", () => {
    const state = engine.recomputeBelief(baseOptions);

    for (const market of demoFixtures.markets) {
      const yes = state.yesProbabilityByContract[market.id];
      const no = state.noProbabilityByContract[market.id];
      expect(yes + no).toBeCloseTo(1.0, 2);
    }
  });

  it("all probabilities are in [0, 1]", () => {
    const state = engine.recomputeBelief(baseOptions);

    expect(state.trueDeescalationProbability).toBeGreaterThanOrEqual(0);
    expect(state.trueDeescalationProbability).toBeLessThanOrEqual(1);
    expect(state.formalAnnouncementProbability).toBeGreaterThanOrEqual(0);
    expect(state.formalAnnouncementProbability).toBeLessThanOrEqual(1);
    expect(state.conditionalAnnouncementGivenEndProbability).toBeGreaterThanOrEqual(0);
    expect(state.conditionalAnnouncementGivenEndProbability).toBeLessThanOrEqual(1);
    expect(state.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(state.confidenceScore).toBeLessThanOrEqual(1);

    for (const market of demoFixtures.markets) {
      const yes = state.yesProbabilityByContract[market.id];
      const no = state.noProbabilityByContract[market.id];
      expect(yes).toBeGreaterThanOrEqual(0);
      expect(yes).toBeLessThanOrEqual(1);
      expect(no).toBeGreaterThanOrEqual(0);
      expect(no).toBeLessThanOrEqual(1);
    }
  });

  it("no NaN or Infinity in belief state", () => {
    const state = engine.recomputeBelief(baseOptions);

    const allValues = [
      state.trueDeescalationProbability,
      state.formalAnnouncementProbability,
      state.conditionalAnnouncementGivenEndProbability,
      state.dailyAnnouncementHazard,
      state.dailyRealDeescalationHazard,
      state.resolutionFrictionScore,
      state.confidenceScore,
      state.wordingRiskScore,
      state.marketDislocationScore,
      ...Object.values(state.yesProbabilityByContract),
      ...Object.values(state.noProbabilityByContract),
      ...Object.values(state.dateBucketProbabilities),
      ...Object.values(state.marginalBucketProbabilities),
    ];

    for (const val of allValues) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it("decomposition components are consistent with yesProbability", () => {
    const state = engine.recomputeBelief(baseOptions);

    for (const market of demoFixtures.markets) {
      const decomp = state.decompositionByContract[market.id];
      // The YES probability should be >= the product of its components
      // (it can be higher due to qualifyingCatalyst floor)
      const product = decomp.realEndByDate * decomp.announcementGivenEnd * decomp.frictionMultiplier;
      // Product should be a reasonable approximation of yesProbability
      expect(product).toBeLessThanOrEqual(decomp.yesProbability + 0.15);
      expect(product).toBeGreaterThanOrEqual(0);
    }
  });

  it("marginal bucket probabilities are non-negative", () => {
    const state = engine.recomputeBelief(baseOptions);

    for (const market of demoFixtures.markets) {
      expect(state.marginalBucketProbabilities[market.id]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("confidence score invariants", () => {
  it("confidence score is in [0, 1]", () => {
    const result = computeConfidence(demoFixtures.signals, []);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("empty signals yield a valid confidence", () => {
    const result = computeConfidence([], []);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(["low", "medium", "high"]).toContain(result.label);
  });

  it("high contradiction load reduces confidence", () => {
    const highContradiction: DriverContribution[] = Array.from({ length: 5 }, (_, i) => ({
      signalId: `sig-${i}`,
      family: "proxyTempo" as const,
      title: "test",
      affects: ["real_end" as const],
      pointsDelta: 0.1,
      confidence: 0.8,
      stale: false,
      correlatedPenaltyApplied: 0,
      contradictionPenaltyApplied: 0.5,
      narrative: "test",
    }));

    const lowContradiction: DriverContribution[] = Array.from({ length: 5 }, (_, i) => ({
      signalId: `sig-${i}`,
      family: "proxyTempo" as const,
      title: "test",
      affects: ["real_end" as const],
      pointsDelta: 0.1,
      confidence: 0.8,
      stale: false,
      correlatedPenaltyApplied: 0,
      contradictionPenaltyApplied: 0,
      narrative: "test",
    }));

    const highResult = computeConfidence(demoFixtures.signals, highContradiction);
    const lowResult = computeConfidence(demoFixtures.signals, lowContradiction);
    expect(highResult.score).toBeLessThan(lowResult.score);
  });
});

describe("edge case: empty signals", () => {
  it("engine handles zero signals gracefully", () => {
    const emptyEngine = new BeliefEngine({
      markets: demoFixtures.markets,
      signals: [],
      marketSnapshots: demoFixtures.marketSnapshots,
    });

    const state = emptyEngine.recomputeBelief(baseOptions);

    // Should produce valid probabilities from priors alone
    expect(Number.isFinite(state.trueDeescalationProbability)).toBe(true);
    expect(state.trueDeescalationProbability).toBeGreaterThanOrEqual(0);
    expect(state.trueDeescalationProbability).toBeLessThanOrEqual(1);

    for (const market of demoFixtures.markets) {
      const yes = state.yesProbabilityByContract[market.id];
      const no = state.noProbabilityByContract[market.id];
      expect(yes + no).toBeCloseTo(1.0, 2);
    }
  });
});

describe("regime detection edge cases", () => {
  it("handles empty market snapshots", () => {
    const regime = detectRegime({
      marketSnapshots: [],
      catalysts: [],
      sourceEvents: [],
      nowIso: "2026-04-09T14:00:00-04:00",
    });

    expect(regime.label).toBe("balanced");
    expect(Number.isFinite(regime.confidenceAdjustment)).toBe(true);
  });

  it("handles empty catalyst list without crashing", () => {
    const regime = detectRegime({
      marketSnapshots: demoFixtures.marketSnapshots,
      catalysts: [],
      sourceEvents: [],
      nowIso: "2026-04-09T14:00:00-04:00",
    });

    expect(["high_volatility", "low_liquidity", "pre_event", "headline_driven", "balanced"]).toContain(regime.label);
  });
});

describe("scenario simulation invariants", () => {
  it("extreme bullish scenario does not produce probability > 1", () => {
    const state = engine.simulateScenario(
      [
        {
          title: "Full ceasefire declared",
          family: "resolutionWording",
          magnitude: 1.0,
          confidence: 1.0,
          rationale: "Maximum bullish signal",
          occurredAt: "2026-04-09T12:00:00-04:00",
        },
        {
          title: "Forces standing down",
          family: "forcePosture",
          magnitude: 1.0,
          confidence: 1.0,
          rationale: "Maximum force confirmation",
          occurredAt: "2026-04-09T12:00:00-04:00",
        },
      ],
      baseOptions,
    );

    for (const market of demoFixtures.markets) {
      expect(state.yesProbabilityByContract[market.id]).toBeLessThanOrEqual(1);
      expect(state.yesProbabilityByContract[market.id]).toBeGreaterThanOrEqual(0);
      expect(state.noProbabilityByContract[market.id]).toBeLessThanOrEqual(1);
      expect(state.noProbabilityByContract[market.id]).toBeGreaterThanOrEqual(0);
    }
  });

  it("extreme bearish scenario does not produce probability < 0", () => {
    const state = engine.simulateScenario(
      [
        {
          title: "Escalation surge",
          family: "proxyTempo",
          magnitude: -1.0,
          confidence: 1.0,
          rationale: "Maximum bearish signal",
          occurredAt: "2026-04-09T12:00:00-04:00",
        },
        {
          title: "Forces mobilize",
          family: "forcePosture",
          magnitude: -1.0,
          confidence: 1.0,
          rationale: "Maximum negative force signal",
          occurredAt: "2026-04-09T12:00:00-04:00",
        },
      ],
      baseOptions,
    );

    for (const market of demoFixtures.markets) {
      expect(state.yesProbabilityByContract[market.id]).toBeGreaterThanOrEqual(0);
      expect(state.noProbabilityByContract[market.id]).toBeGreaterThanOrEqual(0);
      expect(state.noProbabilityByContract[market.id]).toBeLessThanOrEqual(1);
    }
  });
});
