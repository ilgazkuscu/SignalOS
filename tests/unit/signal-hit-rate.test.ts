import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { buildSignalHitRateMetrics } from "@/lib/decision/signal-hit-rate";

describe("signal hit-rate tracking", () => {
  it("aggregates per-family usefulness metrics", () => {
    const metrics = buildSignalHitRateMetrics({
      signals: demoFixtures.signals,
      marketHistory: demoFixtures.marketHistory,
    });

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].usefulMoveRate).toBeGreaterThanOrEqual(0);
    expect(metrics[0].hitRateByHorizon.short).toBeGreaterThanOrEqual(0);
  });
});
