import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { runBacktest } from "@/lib/backtest/backtest-engine";
import { buildCatalystCalendar } from "@/lib/decision/catalyst-calendar";
import { buildThesisCards } from "@/lib/decision/thesis";
import { buildTradeDecisions } from "@/lib/decision/trade-decision";
import { buildExpectedValueRanking } from "@/lib/edge/expected-value";
import { buildExecutionRules } from "@/lib/execution/execution-rules";
import { buildPortfolioSummary } from "@/lib/portfolio/portfolio";
import { detectRegime } from "@/lib/regime/regime-detection";
import { assessWordingRisk } from "@/lib/wording/wording-risk";
import type { BeliefState } from "@/lib/types/domain";

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

function buildFixtureDecisionContext() {
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
  const { decisions, sizingGuidance } = buildTradeDecisions({
    markets: demoFixtures.markets,
    marketSnapshots: demoFixtures.marketSnapshots,
    belief,
    catalystCalendar: catalysts,
    theses,
  });
  return { catalysts, decisions, sizingGuidance };
}

describe("edge engine", () => {
  it("ranks expected value per unit capital", () => {
    const { decisions } = buildFixtureDecisionContext();
    const ev = buildExpectedValueRanking({
      markets: demoFixtures.markets,
      marketSnapshots: demoFixtures.marketSnapshots,
      decisions,
    });

    expect(ev).toHaveLength(demoFixtures.markets.length);
    expect(ev[0].rank).toBe(1);
  });

  it("builds simulated calibration summaries without pretending data is real", () => {
    const { decisions } = buildFixtureDecisionContext();
    const summary = runBacktest({
      markets: demoFixtures.markets,
      decisions,
      marketHistory: demoFixtures.marketHistory,
      signals: demoFixtures.signals,
    });

    expect(summary.dataQuality).toBe("fixture_simulated");
    expect(summary.calibrationCurve.length).toBeGreaterThan(0);
    expect(summary.limitations[0]).toContain("simulated");
  });

  it("generates execution and portfolio risk outputs", () => {
    const { decisions, sizingGuidance, catalysts } = buildFixtureDecisionContext();
    const ev = buildExpectedValueRanking({ markets: demoFixtures.markets, marketSnapshots: demoFixtures.marketSnapshots, decisions });
    const rules = buildExecutionRules({ decisions, expectedValues: ev, catalysts, nowIso: belief.asOf });
    const portfolio = buildPortfolioSummary({ decisions, sizingGuidance, nowIso: belief.asOf });

    expect(rules).toHaveLength(decisions.length);
    expect(portfolio.correlationProxy).toBeGreaterThanOrEqual(0);
  });

  it("detects regime and wording risk from current fixtures", () => {
    const { catalysts } = buildFixtureDecisionContext();
    const regime = detectRegime({
      marketSnapshots: demoFixtures.marketSnapshots,
      catalysts,
      sourceEvents: demoFixtures.sourceEvents,
      nowIso: belief.asOf,
    });
    const wording = assessWordingRisk(demoFixtures.sourceEvents);

    expect(regime.rationale.length).toBeGreaterThan(0);
    expect(wording.score).toBeGreaterThanOrEqual(0);
    expect(wording.flags.length).toBeGreaterThan(0);
  });
});
