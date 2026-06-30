import { NextResponse } from "next/server";
import { getDashboard, getReplayPayload } from "@/lib/api/service";
import { appEnv } from "@/lib/config/env";
import { HORMUZ_EVENT_SLUG, orderHormuzMarkets } from "@/lib/hormuz";
import {
  fetchPolymarketEventMarkets,
  fetchPolymarketHistory,
  fetchPolymarketHistoryForEventMarket,
  parsePolymarketSlugMap,
} from "@/lib/polymarket/fetcher";

export const dynamic = "force-dynamic";

export async function GET() {
  const [data, replay] = await Promise.all([
    getDashboard("balanced"),
    getReplayPayload("balanced"),
  ]);
  const apr15Market = data.markets.find((market) => market.id === "apr-15") ?? data.markets[0];
  const liveApr15History = apr15Market
    ? await fetchPolymarketHistory({
        market: apr15Market,
        slugMap: parsePolymarketSlugMap(appEnv.POLYMARKET_MARKET_SLUG_MAP),
      }).catch(() => [])
    : [];
  const hormuzMarkets = await fetchPolymarketEventMarkets({ eventSlug: HORMUZ_EVENT_SLUG }).catch(() => []);
  const orderedHormuzMarkets = orderHormuzMarkets(hormuzMarkets);
  const liveHormuzHistoryByLabel = Object.fromEntries(
    await Promise.all(
      orderedHormuzMarkets.map(async (market) => [
        market.label,
        await fetchPolymarketHistoryForEventMarket({ market }).catch(() => []),
      ]),
    ),
  );

  return NextResponse.json({
    data,
    replay,
    liveApr15History,
    hormuzMarkets: orderedHormuzMarkets,
    liveHormuzHistoryByLabel,
  });
}
