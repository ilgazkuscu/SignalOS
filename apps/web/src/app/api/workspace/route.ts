import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDashboard, getReplayPayload, getSignalsExplorer, getTimeline } from "@/lib/api/service";
import { appEnv } from "@/lib/config/env";
import { HORMUZ_EVENT_SLUG, orderHormuzMarkets } from "@/lib/hormuz";
import {
  fetchPolymarketEventMarkets,
  fetchPolymarketHistory,
  fetchPolymarketHistoryForEventMarket,
  parsePolymarketSlugMap,
} from "@/lib/polymarket/fetcher";
import { buildFallbackModel2Payload } from "@/lib/signalos/fallback-model2";

export const dynamic = "force-dynamic";

const WORKSPACE_CACHE_TTL_MS = 10_000;
const SIGNALOS_BASE = "http://127.0.0.1:8000";

type WorkspaceScope = "core" | "full";
type WorkspaceResponse = Awaited<ReturnType<typeof buildWorkspacePayload>>;

const cachedWorkspaces = new Map<string, { value: WorkspaceResponse; expiresAt: number }>();
const inflightWorkspaces = new Map<string, Promise<WorkspaceResponse>>();

async function buildWorkspacePayload(scope: WorkspaceScope) {
  const [dashboard, signals, timeline, bundleResponse] = await Promise.all([
    getDashboard("balanced"),
    getSignalsExplorer("balanced"),
    getTimeline(),
    fetch(`${SIGNALOS_BASE}/current_phase/bundle`, { cache: "no-store" }).catch(() => null),
  ]);
  const model2 =
    bundleResponse && bundleResponse.ok
      ? ((await bundleResponse.json()) as { phase: unknown; model: unknown })
      : buildFallbackModel2Payload({ dashboard, signals, timeline });

  if (scope === "core") {
    return {
      dashboard,
      signals,
      timeline,
      model2,
    };
  }

  const replay = await getReplayPayload("balanced");
  const apr15Market = dashboard.markets.find((market) => market.id === "apr-15") ?? dashboard.markets[0];
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

  return {
    dashboard,
    signals,
    timeline,
    replay,
    model2,
    snapshots: {
      liveApr15History,
      hormuzMarkets: orderedHormuzMarkets,
      liveHormuzHistoryByLabel,
    },
  };
}

export async function GET(request: NextRequest) {
  const requestedScope = request.nextUrl.searchParams.get("scope");
  const scope: WorkspaceScope = requestedScope === "full" ? "full" : "core";
  const cacheKey = `workspace:${scope}`;
  const now = Date.now();
  const cachedWorkspace = cachedWorkspaces.get(cacheKey);
  if (cachedWorkspace && cachedWorkspace.expiresAt > now) {
    return NextResponse.json(cachedWorkspace.value);
  }

  let inflightWorkspace = inflightWorkspaces.get(cacheKey);
  if (!inflightWorkspace) {
    inflightWorkspace = buildWorkspacePayload(scope)
      .then((value) => {
        cachedWorkspaces.set(cacheKey, {
          value,
          expiresAt: Date.now() + WORKSPACE_CACHE_TTL_MS,
        });
        return value;
      })
      .finally(() => {
        inflightWorkspaces.delete(cacheKey);
      });
    inflightWorkspaces.set(cacheKey, inflightWorkspace);
  }

  return NextResponse.json(await inflightWorkspace);
}
