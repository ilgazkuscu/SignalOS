import { describe, expect, it } from "vitest";
import { classifyStatementInput, getDashboard, getReplayPayload, getSignalsExplorer, runScenario } from "@/lib/api/service";

describe("api service integration", () => {
  it("dashboard returns aggregate state", async () => {
    const dashboard = await getDashboard("balanced");

    expect(dashboard.markets.length).toBeGreaterThan(0);
    expect(dashboard.currentBelief.yesProbabilityByContract["apr-21"]).toBeGreaterThan(0);
    expect(dashboard.discrepancy.length).toBe(dashboard.markets.length);
    expect(dashboard.opportunities?.length).toBeGreaterThan(0);
    expect(dashboard.alerts?.length).toBeGreaterThan(0);
    expect(dashboard.healthSummary?.healthySources).toBeGreaterThanOrEqual(0);
    expect(dashboard.healthSummary?.updatesStored).toBeGreaterThanOrEqual(0);
    expect(dashboard.sourceCoverage?.length).toBeGreaterThan(0);
  });

  it("scenario run recomputes output", async () => {
    const result = await runScenario("balanced", [
      {
        title: "Official end statement",
        family: "resolutionWording",
        magnitude: 0.99,
        confidence: 0.98,
        rationale: "Should reprice quickly.",
        occurredAt: "2026-04-14T19:15:00-04:00",
      },
    ]);

    expect(result.formalAnnouncementProbability).toBeGreaterThan(0.4);
  });

  it("statement classifier service returns a label", async () => {
    const result = await classifyStatementInput({
      text: "The operation has ended.",
      sourceType: "official",
      officialness: 0.98,
      mediaFormat: "text",
    });

    expect(result.label).toMatch(/qualifies|deescalation/);
  });

  it("scenario run evaluates at the latest scenario event time", async () => {
    const result = await runScenario("balanced", [
      {
        title: "Late official end statement",
        family: "resolutionWording",
        magnitude: 0.99,
        confidence: 0.99,
        rationale: "Late but explicit.",
        occurredAt: "2026-04-14T19:15:00-04:00",
      },
    ]);

    expect(result.asOf).toBe("2026-04-14T23:15:00.000Z");
    expect(result.yesProbabilityByContract["apr-15"]).toBeGreaterThan(0.6);
  });

  it("replay payload includes historical market overlay without future leakage", async () => {
    const replay = await getReplayPayload("balanced");

    expect(replay.marketHistory.length).toBeGreaterThan(20);
    expect(replay.history[0].marketByContract["apr-21"]).toBeGreaterThan(0);
    expect(replay.history[0].activeSignals.some((signal) => signal.id === "sig-explicit-01")).toBe(false);
  });

  it("signals explorer payload computes projected candidate impacts", async () => {
    const payload = await getSignalsExplorer("balanced");
    const explicitImpact = payload.candidateImpacts.find((impact) => impact.signalId === "sig-explicit-01");

    expect(explicitImpact).toBeDefined();
    expect(explicitImpact?.biggestAffectedBucketDelta).toBeGreaterThan(0.2);
  });

  it("live timeline classification propagates into timeline events", async () => {
    const { getTimeline } = await import("@/lib/api/service");
    const timeline = await getTimeline();
    const classified = timeline.events.find((event) => event.liveClassification);

    expect(classified).toBeDefined();
    expect(classified?.liveClassification?.relevanceScore).toBeGreaterThan(0);
    expect(timeline.catalystFeed).toBeDefined();
    expect(timeline.freshness.refreshIntervalMs).toBeGreaterThan(0);
    expect(
      timeline.events.every((event) => new Date(event.occurredAt).getTime() <= Date.now()),
    ).toBe(true);
  });
});
