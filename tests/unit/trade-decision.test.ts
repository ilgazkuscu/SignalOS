import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { buildCatalystCalendar } from "@/lib/decision/catalyst-calendar";
import { buildThesisCards } from "@/lib/decision/thesis";
import { buildTradeDecisions } from "@/lib/decision/trade-decision";

describe("trade decision layer", () => {
  it("produces directional decisions with decomposed component scores", () => {
    const catalystCalendar = buildCatalystCalendar({
      markets: demoFixtures.markets,
      sourceEvents: demoFixtures.sourceEvents,
      nowIso: "2026-04-10T12:00:00-04:00",
    });
    const theses = buildThesisCards({
      markets: demoFixtures.markets,
      sourceEvents: demoFixtures.sourceEvents,
      belief: {
        asOf: "2026-04-10T16:00:00Z",
        profileKey: "balanced",
        trueDeescalationProbability: 0.6,
        formalAnnouncementProbability: 0.28,
        conditionalAnnouncementGivenEndProbability: 0.48,
        dateBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.18, "apr-30": 0.32, "may-31": 0.49, "jun-30": 0.58 },
        marginalBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.1, "apr-30": 0.14, "may-31": 0.17, "jun-30": 0.09 },
        yesProbabilityByContract: { "apr-15": 0.08, "apr-21": 0.18, "apr-30": 0.32, "may-31": 0.49, "jun-30": 0.58 },
        noProbabilityByContract: { "apr-15": 0.92, "apr-21": 0.82, "apr-30": 0.68, "may-31": 0.51, "jun-30": 0.42 },
        decompositionByContract: {
          "apr-15": { realEndByDate: 0.31, announcementGivenEnd: 0.25, frictionMultiplier: 0.72, yesProbability: 0.08 },
          "apr-21": { realEndByDate: 0.44, announcementGivenEnd: 0.34, frictionMultiplier: 0.75, yesProbability: 0.18 },
          "apr-30": { realEndByDate: 0.59, announcementGivenEnd: 0.46, frictionMultiplier: 0.77, yesProbability: 0.32 },
          "may-31": { realEndByDate: 0.74, announcementGivenEnd: 0.64, frictionMultiplier: 0.81, yesProbability: 0.49 },
          "jun-30": { realEndByDate: 0.83, announcementGivenEnd: 0.7, frictionMultiplier: 0.83, yesProbability: 0.58 },
        },
        dailyAnnouncementHazard: 0.024,
        dailyRealDeescalationHazard: 0.031,
        resolutionFrictionScore: 0.28,
        confidenceScore: 0.62,
        confidenceLabel: "medium",
        modelNotes: [],
        wordingRiskScore: 0.29,
        marketDislocationScore: 0.22,
        topPositiveDrivers: [],
        topNegativeDrivers: [],
        staleSignals: [],
      },
    });

    const { decisions, sizingGuidance } = buildTradeDecisions({
      markets: demoFixtures.markets,
      marketSnapshots: demoFixtures.marketSnapshots,
      belief: theses[0] ? {
        asOf: "2026-04-10T16:00:00Z",
        profileKey: "balanced",
        trueDeescalationProbability: 0.6,
        formalAnnouncementProbability: 0.28,
        conditionalAnnouncementGivenEndProbability: 0.48,
        dateBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.18, "apr-30": 0.32, "may-31": 0.49, "jun-30": 0.58 },
        marginalBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.1, "apr-30": 0.14, "may-31": 0.17, "jun-30": 0.09 },
        yesProbabilityByContract: { "apr-15": 0.08, "apr-21": 0.18, "apr-30": 0.32, "may-31": 0.49, "jun-30": 0.58 },
        noProbabilityByContract: { "apr-15": 0.92, "apr-21": 0.82, "apr-30": 0.68, "may-31": 0.51, "jun-30": 0.42 },
        decompositionByContract: {
          "apr-15": { realEndByDate: 0.31, announcementGivenEnd: 0.25, frictionMultiplier: 0.72, yesProbability: 0.08 },
          "apr-21": { realEndByDate: 0.44, announcementGivenEnd: 0.34, frictionMultiplier: 0.75, yesProbability: 0.18 },
          "apr-30": { realEndByDate: 0.59, announcementGivenEnd: 0.46, frictionMultiplier: 0.77, yesProbability: 0.32 },
          "may-31": { realEndByDate: 0.74, announcementGivenEnd: 0.64, frictionMultiplier: 0.81, yesProbability: 0.49 },
          "jun-30": { realEndByDate: 0.83, announcementGivenEnd: 0.7, frictionMultiplier: 0.83, yesProbability: 0.58 },
        },
        dailyAnnouncementHazard: 0.024,
        dailyRealDeescalationHazard: 0.031,
        resolutionFrictionScore: 0.28,
        confidenceScore: 0.62,
        confidenceLabel: "medium",
        modelNotes: [],
        wordingRiskScore: 0.29,
        marketDislocationScore: 0.22,
        topPositiveDrivers: [],
        topNegativeDrivers: [],
        staleSignals: [],
      } : null as never,
      catalystCalendar,
      theses,
    });

    expect(decisions.length).toBe(demoFixtures.markets.length);
    expect(decisions[0].components.gapSize).toBeGreaterThanOrEqual(0);
    expect(["LONG_YES", "LONG_NO", "WATCH", "NO_TRADE"]).toContain(decisions[0].stance);
    expect(sizingGuidance.length).toBe(decisions.length);
  });
});
