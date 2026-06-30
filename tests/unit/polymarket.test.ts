import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendLiveHistory,
  fetchPolymarketPrices,
  mergeLiveHistory,
  parsePolymarketSlugMap,
  toMarketSnapshots,
} from "@/lib/polymarket/fetcher";
import { demoFixtures } from "../../fixtures/demo";

describe("polymarket fetcher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses slug overrides safely", () => {
    expect(parsePolymarketSlugMap('{"apr-21":"custom-slug"}')["apr-21"]).toBe("custom-slug");
    expect(parsePolymarketSlugMap("not-json")).toEqual({});
  });

  it("normalizes live yes prices into market snapshots", () => {
    const snapshots = toMarketSnapshots(
      [
        {
          contractId: "abc",
          bucket: "apr-21",
          yesPrice: 0.24,
          fetchedAt: new Date("2026-04-10T00:00:00Z"),
          volume: 1000,
          liquidity: 500,
          sourceLabel: "Polymarket live",
          slug: "apr-21-slug",
        },
      ],
      demoFixtures.marketSnapshots,
    );

    expect(snapshots.find((snapshot) => snapshot.marketId === "apr-21")).toMatchObject({
      marketId: "apr-21",
      yesPrice: 0.24,
      noPrice: 0.76,
      volume: 1000,
    });
  });

  it("keeps fallback snapshots for buckets missing from a partial live update", () => {
    const snapshots = toMarketSnapshots(
      [
        {
          contractId: "abc",
          bucket: "apr-21",
          yesPrice: 0.24,
          fetchedAt: new Date("2026-04-10T00:00:00Z"),
          volume: 1000,
          liquidity: 500,
          sourceLabel: "Polymarket live",
          slug: "apr-21-slug",
        },
      ],
      demoFixtures.marketSnapshots,
    );

    expect(snapshots).toHaveLength(demoFixtures.marketSnapshots.length);
    expect(snapshots.find((snapshot) => snapshot.marketId === "apr-15")?.yesPrice).toBe(
      demoFixtures.marketSnapshots.find((snapshot) => snapshot.marketId === "apr-15")?.yesPrice,
    );
  });

  it("appends live history without duplicating identical points", () => {
    const history = appendLiveHistory(demoFixtures.marketHistory.slice(0, 1), [
      {
        contractId: "abc",
        bucket: "apr-15",
        yesPrice: 0.12,
        fetchedAt: new Date("2026-04-10T00:00:00Z"),
        sourceLabel: "Polymarket live",
        slug: "apr-15-slug",
      },
      {
        contractId: "abc",
        bucket: "apr-15",
        yesPrice: 0.12,
        fetchedAt: new Date("2026-04-10T00:00:00Z"),
        sourceLabel: "Polymarket live",
        slug: "apr-15-slug",
      },
    ]);

    expect(history.filter((point) => point.marketId === "apr-15")).toHaveLength(2);
  });

  it("merges live clob history into the replay history timeline", () => {
    const history = mergeLiveHistory(
      demoFixtures.marketHistory.slice(0, 1),
      [
        {
          bucket: "apr-15",
          timestamp: "2026-04-10T03:00:00Z",
          yesPrice: 0.01,
          sourceLabel: "Polymarket CLOB history",
          slug: "apr-15-slug",
        },
      ],
      [
        {
          contractId: "abc",
          bucket: "apr-15",
          yesPrice: 0.009,
          fetchedAt: new Date("2026-04-10T04:00:00Z"),
          sourceLabel: "Polymarket live",
          slug: "apr-15-slug",
        },
      ],
    );

    expect(history.some((point) => point.marketId === "apr-15" && point.timestamp === "2026-04-10T03:00:00Z")).toBe(true);
    expect(history.some((point) => point.marketId === "apr-15" && point.timestamp === "2026-04-10T04:00:00.000Z")).toBe(true);
  });

  it("fetches and resolves live yes prices from outcomePrices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "1918792",
          slug: "trump-announces-end-of-military-operations-against-iran-by-april-21st",
          outcomes: ["Yes", "No"],
          outcomePrices: ["0.245", "0.755"],
          volume: 131696.01,
          liquidity: 47289.14,
        }),
      }),
    );

    const prices = await fetchPolymarketPrices({
      markets: [demoFixtures.markets[1]],
      slugMap: { "apr-21": "trump-announces-end-of-military-operations-against-iran-by-april-21st" },
      timeoutMs: 1_000,
    });

    expect(prices[0]?.bucket).toBe("apr-21");
    expect(prices[0]?.yesPrice).toBeCloseTo(0.245, 6);
  });
});
