import { afterEach, describe, expect, it, vi } from "vitest";

describe("live market integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env.POLYMARKET_LIVE_ENABLED;
    delete process.env.POLYMARKET_POLL_INTERVAL_MS;
    delete process.env.POLYMARKET_MARKET_SLUG_MAP;
  });

  it("falls back cleanly when live market fetch fails", async () => {
    process.env.POLYMARKET_LIVE_ENABLED = "true";
    process.env.POLYMARKET_POLL_INTERVAL_MS = "60000";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

    const { getDashboard } = await import("@/lib/api/service");
    const dashboard = await getDashboard("balanced");

    expect(dashboard.marketDataSource).toBe("fixture");
    expect(dashboard.marketSnapshots.find((snapshot) => snapshot.marketId === "apr-15")?.yesPrice).toBeCloseTo(0.24, 6);
  });
});
