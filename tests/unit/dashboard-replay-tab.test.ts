import { describe, expect, it } from "vitest";
import type { FamilyReplaySeries } from "@/engine/family";
import { buildReplayRowsForBucket } from "@/app/dashboard/replay-tab";

const replaySeries: FamilyReplaySeries = {
  familyId: "hormuz-closure",
  horizon: { start: "2026-04-10T00:00:00.000Z", end: "2026-04-16T00:00:00.000Z" },
  frameInterval: "daily",
  generatedAt: "2026-04-16T00:00:00.000Z",
  frames: [
    {
      timestamp: "2026-04-10T00:00:00.000Z",
      aggregateModelProbability: 0.2,
      aggregateMarketProbability: 0.2,
      activeCount: 3,
      closedCount: 0,
      signalsInScope: [],
      bucketSnapshots: [
        { bucketId: "April 15", polymarketSlug: "apr-15", outcome: "YES by date", status: "active", modelProbability: 0.22, marketPrice: 0.2, weight: 0.08, resolvesAt: "2026-04-15T23:59:59-04:00", resolvedOutcome: null },
        { bucketId: "April 30", polymarketSlug: "apr-30", outcome: "YES by date", status: "active", modelProbability: 0.41, marketPrice: 0.37, weight: 0.34, resolvesAt: "2026-04-30T23:59:59-04:00", resolvedOutcome: null },
        { bucketId: "May 31", polymarketSlug: "may-31", outcome: "YES by date", status: "active", modelProbability: 0.49, marketPrice: 0.46, weight: 0.3, resolvesAt: "2026-05-31T23:59:59-04:00", resolvedOutcome: null },
      ],
    },
    {
      timestamp: "2026-04-12T00:00:00.000Z",
      aggregateModelProbability: 0.2,
      aggregateMarketProbability: 0.2,
      activeCount: 3,
      closedCount: 0,
      signalsInScope: [],
      bucketSnapshots: [
        { bucketId: "April 15", polymarketSlug: "apr-15", outcome: "YES by date", status: "active", modelProbability: 0.28, marketPrice: 0.24, weight: 0.08, resolvesAt: "2026-04-15T23:59:59-04:00", resolvedOutcome: null },
        { bucketId: "April 30", polymarketSlug: "apr-30", outcome: "YES by date", status: "active", modelProbability: 0.45, marketPrice: 0.39, weight: 0.34, resolvesAt: "2026-04-30T23:59:59-04:00", resolvedOutcome: null },
        { bucketId: "May 31", polymarketSlug: "may-31", outcome: "YES by date", status: "active", modelProbability: 0.53, marketPrice: 0.47, weight: 0.3, resolvesAt: "2026-05-31T23:59:59-04:00", resolvedOutcome: null },
      ],
    },
    {
      timestamp: "2026-04-16T00:00:00.000Z",
      aggregateModelProbability: 0.2,
      aggregateMarketProbability: 0.2,
      activeCount: 2,
      closedCount: 1,
      signalsInScope: [],
      bucketSnapshots: [
        { bucketId: "April 15", polymarketSlug: "apr-15", outcome: "YES by date", status: "closed", modelProbability: null, marketPrice: null, weight: 0.08, resolvesAt: "2026-04-15T23:59:59-04:00", resolvedOutcome: "no" },
        { bucketId: "April 30", polymarketSlug: "apr-30", outcome: "YES by date", status: "active", modelProbability: 0.47, marketPrice: 0.42, weight: 0.34, resolvesAt: "2026-04-30T23:59:59-04:00", resolvedOutcome: null },
        { bucketId: "May 31", polymarketSlug: "may-31", outcome: "YES by date", status: "active", modelProbability: null, marketPrice: 0.49, weight: 0.3, resolvesAt: "2026-05-31T23:59:59-04:00", resolvedOutcome: null },
      ],
    },
  ],
};

describe("buildReplayRowsForBucket", () => {
  it("keeps April 30 working", () => {
    const rows = buildReplayRowsForBucket(replaySeries, "April 30");
    expect(rows).toHaveLength(3);
    expect(rows.at(-1)).toMatchObject({ modelYes: 47, marketYes: 42, gap: 5 });
  });

  it("works for other valid dates too", () => {
    const rows = buildReplayRowsForBucket(replaySeries, "April 15");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ modelYes: 22, marketYes: 20, gap: 2 });
    expect(rows[1]).toMatchObject({ modelYes: 28, marketYes: 24, gap: 4 });
  });

  it("skips thinner frames with missing data", () => {
    const rows = buildReplayRowsForBucket(replaySeries, "May 31");
    expect(rows).toHaveLength(2);
    expect(rows.at(-1)).toMatchObject({ modelYes: 53, marketYes: 47, gap: 6 });
  });

  it("returns empty for an invalid selected date", () => {
    expect(buildReplayRowsForBucket(replaySeries, "June 30")).toEqual([]);
  });
});
