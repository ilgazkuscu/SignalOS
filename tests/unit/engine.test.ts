import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { BeliefEngine } from "@/modules/belief";

describe("belief engine", () => {
  const engine = new BeliefEngine({
    markets: demoFixtures.markets,
    signals: demoFixtures.signals,
    marketSnapshots: demoFixtures.marketSnapshots,
  });

  it("positive de-escalation signals increase true-end probability", () => {
    const state = engine.recomputeBelief({
      now: new Date("2026-04-09T14:00:00-04:00"),
      profileKey: "balanced",
    });

    expect(state.trueDeescalationProbability).toBeGreaterThan(0.3);
  });

  it("ambiguous official wording does not overpower qualifying odds", () => {
    const state = engine.recomputeBelief({
      now: new Date("2026-04-09T14:00:00-04:00"),
      profileKey: "balanced",
    });

    expect(state.yesProbabilityByContract["apr-15"]).toBeLessThan(0.55);
  });

  it("explicit official end statement sharply raises YES", () => {
    const state = engine.simulateScenario(
      [
        {
          title: "Official end statement",
          family: "resolutionWording",
          magnitude: 0.99,
          confidence: 0.98,
          rationale: "Explicitly says operations have concluded.",
          occurredAt: "2026-04-14T19:15:00-04:00",
        },
      ],
      {
        now: new Date("2026-04-14T20:00:00-04:00"),
        profileKey: "balanced",
      },
    );

    expect(state.yesProbabilityByContract["apr-15"]).toBeGreaterThan(0.6);
  });

  it("contract buckets are monotone non-decreasing by deadline", () => {
    const state = engine.recomputeBelief({
      now: new Date("2026-04-14T20:00:00-04:00"),
      profileKey: "balanced",
    });

    expect(state.yesProbabilityByContract["apr-21"]).toBeGreaterThanOrEqual(state.yesProbabilityByContract["apr-15"]);
    expect(state.yesProbabilityByContract["apr-30"]).toBeGreaterThanOrEqual(state.yesProbabilityByContract["apr-21"]);
    expect(state.yesProbabilityByContract["may-31"]).toBeGreaterThanOrEqual(state.yesProbabilityByContract["apr-30"]);
    expect(state.yesProbabilityByContract["jun-30"]).toBeGreaterThanOrEqual(state.yesProbabilityByContract["may-31"]);
  });

  it("contradiction-heavy scenario reduces confidence", () => {
    const contradictionState = engine.simulateScenario(
      [
        {
          title: "Proxy strike",
          family: "proxyTempo",
          magnitude: -0.95,
          confidence: 0.95,
          rationale: "Severe contradiction.",
          occurredAt: "2026-04-12T05:00:00-04:00",
        },
      ],
      {
        now: new Date("2026-04-12T12:00:00-04:00"),
        profileKey: "balanced",
      },
    );

    expect(contradictionState.confidenceScore).toBeLessThan(0.8);
  });

  it("duplicate correlated signals are down-weighted", () => {
    const duplicateEngine = engine.ingestSignal({
      ...demoFixtures.signals[3],
      id: "sig-flight-02",
    });
    const duplicateState = duplicateEngine.recomputeBelief({
      now: new Date("2026-04-09T14:00:00-04:00"),
      profileKey: "balanced",
    });

    expect(duplicateState.topPositiveDrivers.some((driver) => driver.correlatedPenaltyApplied > 0)).toBe(true);
  });

  it("replay output is deterministic and chronologically ordered", () => {
    const firstReplay = engine.replayRange(
      new Date("2026-04-08T00:00:00-04:00"),
      new Date("2026-04-10T00:00:00-04:00"),
      "balanced",
    );
    const secondReplay = engine.replayRange(
      new Date("2026-04-08T00:00:00-04:00"),
      new Date("2026-04-10T00:00:00-04:00"),
      "balanced",
    );

    expect(firstReplay).toEqual(secondReplay);
    expect(firstReplay[0].asOf <= firstReplay[firstReplay.length - 1].asOf).toBe(true);
  });
});
