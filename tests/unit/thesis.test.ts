import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { buildThesisCards } from "@/lib/decision/thesis";

describe("thesis change box", () => {
  it("falls back to provisional messaging when structured evidence is sparse", () => {
    const cards = buildThesisCards({
      markets: demoFixtures.markets.slice(0, 1),
      sourceEvents: [],
      belief: {
        asOf: "2026-04-10T16:00:00Z",
        profileKey: "balanced",
        trueDeescalationProbability: 0.5,
        formalAnnouncementProbability: 0.22,
        conditionalAnnouncementGivenEndProbability: 0.44,
        dateBucketProbabilities: { "apr-15": 0.1, "apr-21": 0.18, "apr-30": 0.26, "may-31": 0.41, "jun-30": 0.51 },
        marginalBucketProbabilities: { "apr-15": 0.1, "apr-21": 0.08, "apr-30": 0.08, "may-31": 0.15, "jun-30": 0.1 },
        yesProbabilityByContract: { "apr-15": 0.1, "apr-21": 0.18, "apr-30": 0.26, "may-31": 0.41, "jun-30": 0.51 },
        noProbabilityByContract: { "apr-15": 0.9, "apr-21": 0.82, "apr-30": 0.74, "may-31": 0.59, "jun-30": 0.49 },
        decompositionByContract: {
          "apr-15": { realEndByDate: 0.28, announcementGivenEnd: 0.22, frictionMultiplier: 0.7, yesProbability: 0.1 },
          "apr-21": { realEndByDate: 0.4, announcementGivenEnd: 0.31, frictionMultiplier: 0.72, yesProbability: 0.18 },
          "apr-30": { realEndByDate: 0.5, announcementGivenEnd: 0.41, frictionMultiplier: 0.76, yesProbability: 0.26 },
          "may-31": { realEndByDate: 0.62, announcementGivenEnd: 0.55, frictionMultiplier: 0.79, yesProbability: 0.41 },
          "jun-30": { realEndByDate: 0.74, announcementGivenEnd: 0.61, frictionMultiplier: 0.82, yesProbability: 0.51 },
        },
        dailyAnnouncementHazard: 0.02,
        dailyRealDeescalationHazard: 0.025,
        resolutionFrictionScore: 0.32,
        confidenceScore: 0.41,
        confidenceLabel: "low",
        modelNotes: [],
        wordingRiskScore: 0.39,
        marketDislocationScore: 0.18,
        topPositiveDrivers: [],
        topNegativeDrivers: [],
        staleSignals: [],
      },
    });

    expect(cards[0].provisional).toBe(true);
    expect(cards[0].bullishCatalyst).toContain("Insufficient structured evidence");
  });
});
