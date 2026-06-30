import { appEnv } from "@/lib/config/env";
import {
  fetchPolymarketHistory,
  fetchPolymarketPrices,
  type LiveMarketPrice,
  mergeLiveHistory,
  parsePolymarketSlugMap,
  toMarketSnapshots,
} from "@/lib/polymarket/fetcher";
import type { MarketDefinition, MarketHistoryPoint, MarketSnapshot } from "@/lib/types/domain";

type LiveMarketCache = {
  markets: MarketDefinition[];
  snapshots: MarketSnapshot[];
  history: MarketHistoryPoint[];
  fetchedAt: number;
  source: "live" | "cache" | "fixture";
};

declare global {
  var __iranOpsLiveMarketCache: LiveMarketCache | undefined;
}

function getCache() {
  return globalThis.__iranOpsLiveMarketCache;
}

function setCache(value: LiveMarketCache) {
  globalThis.__iranOpsLiveMarketCache = value;
}

function withLiveMarketStatus(markets: MarketDefinition[], livePrices: LiveMarketPrice[]) {
  const liveByBucket = new Map(livePrices.map((price) => [price.bucket, price]));

  return markets.map((market) => {
    const live = liveByBucket.get(market.id);
    if (!live) return market;

    return {
      ...market,
      marketStatus: live.closed ? "closed" : "open",
      closedAt: live.closedTime,
      resolvedOutcome: live.resolvedOutcome,
    } satisfies MarketDefinition;
  });
}

export async function getResolvedMarketData({
  markets,
  fallbackSnapshots,
  fallbackHistory,
}: {
  markets: MarketDefinition[];
  fallbackSnapshots: MarketSnapshot[];
  fallbackHistory: MarketHistoryPoint[];
}) {
  if (!appEnv.POLYMARKET_LIVE_ENABLED) {
    return {
      markets,
      marketSnapshots: fallbackSnapshots,
      marketHistory: fallbackHistory,
      marketDataSource: "fixture" as const,
    };
  }

  const cached = getCache();
  const pollIntervalMs = appEnv.POLYMARKET_POLL_INTERVAL_MS;
  if (cached && cached.source === "live" && Date.now() - cached.fetchedAt < pollIntervalMs) {
    return {
      markets: cached.markets,
      marketSnapshots: cached.snapshots,
      marketHistory: cached.history,
      marketDataSource: cached.source,
    };
  }

  try {
    const slugMap = parsePolymarketSlugMap(appEnv.POLYMARKET_MARKET_SLUG_MAP);
    const livePrices = await fetchPolymarketPrices({
      markets,
      slugMap,
    });
    const liveHistorySettled = await Promise.allSettled(
      markets.map((market) =>
        fetchPolymarketHistory({
          market,
          slugMap,
          interval: "max",
          fidelity: 60,
        }),
      ),
    );
    const liveHistory = liveHistorySettled.flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;
      console.warn(`Polymarket live history unavailable for ${markets[index]?.id ?? "unknown bucket"}.`, result.reason);
      return [];
    });
    const liveSnapshots = toMarketSnapshots(livePrices, fallbackSnapshots);
    const mergedHistory = mergeLiveHistory(fallbackHistory, liveHistory, livePrices);
    const enrichedMarkets = withLiveMarketStatus(markets, livePrices);
    setCache({
      markets: enrichedMarkets,
      snapshots: liveSnapshots,
      history: mergedHistory,
      fetchedAt: Date.now(),
      source: "live",
    });

    return {
      markets: enrichedMarkets,
      marketSnapshots: liveSnapshots,
      marketHistory: mergedHistory,
      marketDataSource: "live" as const,
    };
  } catch (error) {
    console.warn("Live Polymarket fetch failed. Falling back to cache or fixtures.", error);

    if (cached && cached.source === "live") {
      return {
        markets: cached.markets,
        marketSnapshots: cached.snapshots,
        marketHistory: cached.history,
        marketDataSource: "cache" as const,
      };
    }

    return {
      markets,
      marketSnapshots: fallbackSnapshots,
      marketHistory: fallbackHistory,
      marketDataSource: "fixture" as const,
    };
  }
}
