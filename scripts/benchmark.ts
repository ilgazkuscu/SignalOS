import { performance } from "node:perf_hooks";
import { demoFixtures } from "../fixtures/demo";
import { clusterSourceEvents } from "../apps/web/src/lib/intelligence/event-clustering";
import { buildCatalystCalendar } from "../apps/web/src/lib/decision/catalyst-calendar";
import { buildThesisCards } from "../apps/web/src/lib/decision/thesis";
import { buildTradeDecisions } from "../apps/web/src/lib/decision/trade-decision";
import type { BeliefState } from "../apps/web/src/lib/types/domain";

const belief: BeliefState = {
  asOf: "2026-04-10T16:00:00Z",
  profileKey: "balanced",
  trueDeescalationProbability: 0.62,
  formalAnnouncementProbability: 0.3,
  conditionalAnnouncementGivenEndProbability: 0.48,
  dateBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.2, "apr-30": 0.34, "may-31": 0.51, "jun-30": 0.61 },
  marginalBucketProbabilities: { "apr-15": 0.08, "apr-21": 0.12, "apr-30": 0.14, "may-31": 0.17, "jun-30": 0.1 },
  yesProbabilityByContract: { "apr-15": 0.08, "apr-21": 0.2, "apr-30": 0.34, "may-31": 0.51, "jun-30": 0.61 },
  noProbabilityByContract: { "apr-15": 0.92, "apr-21": 0.8, "apr-30": 0.66, "may-31": 0.49, "jun-30": 0.39 },
  decompositionByContract: {
    "apr-15": { realEndByDate: 0.31, announcementGivenEnd: 0.25, frictionMultiplier: 0.72, yesProbability: 0.08 },
    "apr-21": { realEndByDate: 0.44, announcementGivenEnd: 0.34, frictionMultiplier: 0.75, yesProbability: 0.2 },
    "apr-30": { realEndByDate: 0.59, announcementGivenEnd: 0.46, frictionMultiplier: 0.77, yesProbability: 0.34 },
    "may-31": { realEndByDate: 0.74, announcementGivenEnd: 0.64, frictionMultiplier: 0.81, yesProbability: 0.51 },
    "jun-30": { realEndByDate: 0.83, announcementGivenEnd: 0.7, frictionMultiplier: 0.83, yesProbability: 0.61 },
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
};

function measure(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
}

measure("clusterSourceEvents x1000", () => {
  for (let index = 0; index < 1000; index += 1) {
    clusterSourceEvents(demoFixtures.sourceEvents);
  }
});

measure("decisionPipeline x1000", () => {
  for (let index = 0; index < 1000; index += 1) {
    const catalysts = buildCatalystCalendar({
      markets: demoFixtures.markets,
      sourceEvents: demoFixtures.sourceEvents,
      nowIso: belief.asOf,
    });
    const theses = buildThesisCards({
      markets: demoFixtures.markets,
      sourceEvents: demoFixtures.sourceEvents,
      belief,
    });
    buildTradeDecisions({
      markets: demoFixtures.markets,
      marketSnapshots: demoFixtures.marketSnapshots,
      belief,
      catalystCalendar: catalysts,
      theses,
    });
  }
});
