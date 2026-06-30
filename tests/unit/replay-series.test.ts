import { describe, expect, it } from "vitest";
import { computeEngineReplaySeries, computeReplaySeries } from "@/engine/replay-series";
import { iranOpsEndgameFamily } from "@/engine/families/iran-ops-endgame";
import type { MarketFamily } from "@/engine/family";
import type { Signal } from "@/lib/types/domain";
import { demoFixtures } from "../../fixtures/demo";

const baseFamily: MarketFamily = {
  id: "test-family",
  displayName: "Test Family",
  shortThesis: "Test ladder",
  description: "Test ladder for replay series.",
  primaryReplayBucketId: "b",
  bucketOrder: [
    {
      id: "a",
      label: "A",
      weight: 0.4,
      role: "Front",
      polymarketSlug: "a",
      opensAt: "2026-04-01T00:00:00Z",
      resolvesAt: "2026-04-15T00:00:00Z",
    },
    {
      id: "b",
      label: "B",
      weight: 0.6,
      role: "Back",
      polymarketSlug: "b",
      opensAt: "2026-04-05T00:00:00Z",
      resolvesAt: "2026-04-25T00:00:00Z",
    },
    {
      id: "c",
      label: "C",
      weight: 0.5,
      role: "Later",
      polymarketSlug: "c",
      opensAt: "2026-04-10T00:00:00Z",
      resolvesAt: "2026-04-30T00:00:00Z",
    },
  ],
  relevantSignalTypes: ["resolutionWording"],
  signalWeights: { resolutionWording: 1 },
  signalBucketInfluence: { resolutionWording: { a: 1, b: 1, c: 1 } },
  news: { keywords: [], entities: [], minScore: 1 },
  playbook: null,
};

const baseSignals: Signal[] = [
  {
    id: "sig-1",
    family: "resolutionWording",
    type: "statement",
    subtype: "soft",
    direction: "pro_yes",
    magnitude: 0.2,
    confidence: 0.9,
    occurredAt: "2026-04-10T00:00:00Z",
    sourceId: "test",
    sourceEventId: "evt-1",
    rationale: "Test signal",
    derivedFeatures: {},
    rawPayload: {},
    extractionMethod: "test",
    status: "verified",
    decayHalfLifeHours: 24,
  },
];

describe("replay series", () => {
  it("is deterministic for identical inputs", () => {
    const run = () =>
      computeReplaySeries(baseFamily, {
        from: new Date("2026-03-25T00:00:00Z"),
        to: new Date("2026-04-20T00:00:00Z"),
        interval: "daily",
        generatedAt: "2026-04-20T00:00:00Z",
        signals: baseSignals,
        marketHistoryByBucketId: {
          a: [{ timestamp: "2026-04-12T00:00:00Z", yesPrice: 0.3 }],
          b: [{ timestamp: "2026-04-12T00:00:00Z", yesPrice: 0.4 }],
          c: [{ timestamp: "2026-04-12T00:00:00Z", yesPrice: 0.5 }],
        },
        evaluateModelAt: ({ signalIdsInScope }) =>
          Object.fromEntries(baseFamily.bucketOrder.map((bucket) => [bucket.id, 0.2 + signalIdsInScope.length * 0.1])),
      });

    expect(run()).toEqual(run());
  });

  it("transitions bucket status from not_yet_issued to active to closed on the correct frames", () => {
    const series = computeReplaySeries(baseFamily, {
      from: new Date("2026-03-25T00:00:00Z"),
      to: new Date("2026-04-20T00:00:00Z"),
      interval: "daily",
      generatedAt: "2026-04-20T00:00:00Z",
      signals: [],
      marketHistoryByBucketId: { a: [], b: [], c: [] },
      evaluateModelAt: () => ({ a: 0.1, b: 0.2, c: 0.3 }),
    });

    const preOpen = series.frames.find((frame) => frame.timestamp === "2026-03-25T00:00:00.000Z");
    const active = series.frames.find((frame) => frame.timestamp === "2026-04-06T00:00:00.000Z");
    const closed = series.frames.find((frame) => frame.timestamp === "2026-04-16T00:00:00.000Z");

    expect(preOpen?.bucketSnapshots.find((bucket) => bucket.bucketId === "a")?.status).toBe("not_yet_issued");
    expect(active?.bucketSnapshots.find((bucket) => bucket.bucketId === "a")?.status).toBe("active");
    expect(closed?.bucketSnapshots.find((bucket) => bucket.bucketId === "a")?.status).toBe("closed");
  });

  it("does not leak future signals into earlier frames", () => {
    const series = computeReplaySeries(baseFamily, {
      from: new Date("2026-04-05T00:00:00Z"),
      to: new Date("2026-04-12T00:00:00Z"),
      interval: "daily",
      generatedAt: "2026-04-12T00:00:00Z",
      signals: baseSignals,
      marketHistoryByBucketId: { a: [], b: [], c: [] },
      evaluateModelAt: ({ signalIdsInScope }) => ({
        a: signalIdsInScope.includes("sig-1") ? 0.9 : 0.2,
        b: signalIdsInScope.includes("sig-1") ? 0.9 : 0.2,
        c: signalIdsInScope.includes("sig-1") ? 0.9 : 0.2,
      }),
    });

    const apr5 = series.frames.find((frame) => frame.timestamp === "2026-04-05T00:00:00.000Z");
    const apr11 = series.frames.find((frame) => frame.timestamp === "2026-04-11T00:00:00.000Z");

    expect(apr5?.bucketSnapshots.find((bucket) => bucket.bucketId === "b")?.modelProbability).toBe(0.2);
    expect(apr11?.bucketSnapshots.find((bucket) => bucket.bucketId === "b")?.modelProbability).toBe(0.9);
  });

  it("computes the aggregate from active buckets only", () => {
    const series = computeReplaySeries(baseFamily, {
      from: new Date("2026-04-16T00:00:00Z"),
      to: new Date("2026-04-16T00:00:00Z"),
      interval: "daily",
      generatedAt: "2026-04-16T00:00:00Z",
      signals: [],
      marketHistoryByBucketId: {
        a: [{ timestamp: "2026-04-14T00:00:00Z", yesPrice: 0.2 }],
        b: [{ timestamp: "2026-04-14T00:00:00Z", yesPrice: 0.4 }],
        c: [{ timestamp: "2026-04-14T00:00:00Z", yesPrice: 0.8 }],
      },
      evaluateModelAt: () => ({ a: 0.1, b: 0.5, c: 0.9 }),
    });

    const frame = series.frames[0];

    expect(frame.activeCount).toBe(2);
    expect(frame.closedCount).toBe(1);
    expect(frame.aggregateModelProbability).toBe(0.682);
    expect(frame.aggregateMarketProbability).toBe(0.582);
  });

  it("produces a stable Iran replay regression with correct frame semantics", () => {
    const series = computeEngineReplaySeries(iranOpsEndgameFamily, {
      from: new Date("2026-04-08T00:00:00-04:00"),
      to: new Date("2026-04-16T00:00:00-04:00"),
      interval: "daily",
      generatedAt: "2026-04-16T00:00:00-04:00",
      profileKey: "balanced",
      markets: demoFixtures.markets,
      signals: demoFixtures.signals,
      marketHistory: demoFixtures.marketHistory,
    });

    expect(series.frames).toHaveLength(9);

    const apr9 = series.frames.find((frame) => frame.timestamp === "2026-04-09T04:00:00.000Z");
    const apr16 = series.frames.find((frame) => frame.timestamp === "2026-04-16T04:00:00.000Z");

    expect(apr9?.activeCount).toBe(5);
    expect(apr9?.closedCount).toBe(0);
    expect(apr16?.activeCount).toBe(4);
    expect(apr16?.closedCount).toBe(1);
    expect(apr16?.bucketSnapshots.find((bucket) => bucket.bucketId === "apr-15")?.resolvedOutcome).toBe("no");
  });
});
