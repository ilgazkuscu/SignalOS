import type { MarketDefinition, MarketHistoryPoint, MarketId, MarketSnapshot } from "@/lib/types/domain";

export interface LiveMarketPrice {
  contractId: string;
  bucket: MarketId;
  yesPrice: number;
  fetchedAt: Date;
  volume?: number;
  liquidity?: number;
  sourceLabel: string;
  slug: string;
  active?: boolean;
  closed?: boolean;
  closedTime?: string;
  endDate?: string;
  resolvedOutcome?: "yes" | "no" | null;
}

export interface LiveMarketHistoryPoint {
  bucket: MarketId;
  timestamp: string;
  yesPrice: number;
  sourceLabel: string;
  slug: string;
}

export interface PolymarketEventMarket {
  id: string;
  slug: string;
  question: string;
  label: string;
  eventSlug: string;
  yesPrice: number;
  volume?: number;
  liquidity?: number;
  clobTokenIds: string[];
  active?: boolean;
  closed?: boolean;
  closedTime?: string;
  endDate?: string;
  resolvedOutcome?: "yes" | "no" | null;
}

export interface EventMarketHistoryPoint {
  marketId: string;
  label: string;
  timestamp: string;
  yesPrice: number;
  sourceLabel: string;
  slug: string;
}

const DEFAULT_MARKET_SLUGS: Record<MarketId, string> = {
  "apr-15": "trump-announces-end-of-military-operations-against-iran-by-april-15th-962-364-677",
  "apr-21": "trump-announces-end-of-military-operations-against-iran-by-april-21st",
  "apr-30": "trump-announces-end-of-military-operations-against-iran-by-april-30th-753-882-164-769-641-926-643",
  "may-31": "trump-announces-end-of-military-operations-against-iran-by-may-31st-651-724-212-638",
  "jun-30": "trump-announces-end-of-military-operations-against-iran-by-june-30th-566-326-653-781-167-426-752-225-438",
};

export function parsePolymarketSlugMap(raw: string | undefined) {
  if (!raw) return {} as Partial<Record<MarketId, string>>;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<MarketId, string>>;
    return parsed ?? {};
  } catch {
    console.warn("Failed to parse POLYMARKET_MARKET_SLUG_MAP. Falling back to built-in slugs.");
    return {} as Partial<Record<MarketId, string>>;
  }
}

function clampPrice(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function resolveYesPrice(payload: {
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  lastTradePrice?: number | string | null;
}) {
  const outcomes = Array.isArray(payload.outcomes)
    ? payload.outcomes
    : typeof payload.outcomes === "string"
      ? JSON.parse(payload.outcomes)
      : [];
  const outcomePrices = Array.isArray(payload.outcomePrices)
    ? payload.outcomePrices
    : typeof payload.outcomePrices === "string"
      ? JSON.parse(payload.outcomePrices)
      : [];

  const yesIndex = outcomes.findIndex((outcome: string) => String(outcome).toLowerCase() === "yes");
  if (yesIndex >= 0 && outcomePrices[yesIndex] !== undefined) {
    return clampPrice(Number(outcomePrices[yesIndex]));
  }

  return clampPrice(Number(payload.lastTradePrice ?? 0.5));
}

function resolveClosedOutcome(yesPrice: number, closed?: boolean) {
  if (!closed) return null;
  if (yesPrice >= 0.999) return "yes" as const;
  if (yesPrice <= 0.001) return "no" as const;
  return null;
}

function normalizeTimestamp(value: string | undefined) {
  if (!value) return undefined;
  const normalized = (value.includes(" ") ? value.replace(" ", "T") : value)
    .replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : value;
}

function parseJsonArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

async function fetchGammaMarketBySlug(
  marketSlug: string,
  signal?: AbortSignal,
) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    Accept: "application/json",
  };

  const response = await fetch(`https://gamma-api.polymarket.com/markets/slug/${marketSlug}`, {
    headers,
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Polymarket request failed for ${marketSlug}: ${response.status}`);
  }

  return response.json() as Promise<{
    id?: string | number;
    slug?: string;
    outcomes?: string | string[];
    outcomePrices?: string | string[];
    lastTradePrice?: number | string | null;
    volume?: number | string;
    liquidity?: number | string;
    clobTokenIds?: string | string[];
    active?: boolean;
    closed?: boolean;
    closedTime?: string;
    endDate?: string;
  }>;
}

function resolveMarketSlugCandidates(
  market: MarketDefinition,
  slugMap?: Partial<Record<MarketId, string>>,
) {
  return Array.from(
    new Set(
      [
        slugMap?.[market.id],
        DEFAULT_MARKET_SLUGS[market.id],
      ].filter((slug): slug is string => Boolean(slug)),
    ),
  );
}

async function fetchGammaMarketForMarket(
  market: MarketDefinition,
  slugMap?: Partial<Record<MarketId, string>>,
  signal?: AbortSignal,
) {
  const candidates = resolveMarketSlugCandidates(market, slugMap);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await fetchGammaMarketBySlug(candidate, signal);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Polymarket request failed for ${market.id}.`);
}

export async function fetchPolymarketEventMarkets({
  eventSlug,
  timeoutMs = 12_000,
}: {
  eventSlug: string;
  timeoutMs?: number;
}): Promise<PolymarketEventMarket[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://gamma-api.polymarket.com/events/slug/${eventSlug}?includeMarkets=true`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Polymarket event request failed for ${eventSlug}: ${response.status}`);
    }

    const payload = (await response.json()) as {
      slug?: string;
      markets?: Array<{
        id?: string | number;
        slug?: string;
        question?: string;
        groupItemTitle?: string;
        outcomes?: string | string[];
        outcomePrices?: string | string[];
        lastTradePrice?: number | string | null;
        volume?: number | string;
        liquidity?: number | string;
        clobTokenIds?: string | string[];
        active?: boolean;
        closed?: boolean;
        closedTime?: string;
        endDate?: string;
      }>;
    };

    return (payload.markets ?? [])
      .map((market) => {
        const yesPrice = resolveYesPrice(market);
        return {
          id: String(market.id ?? market.slug ?? market.groupItemTitle ?? "unknown"),
          slug: market.slug ?? "",
          question: market.question ?? market.groupItemTitle ?? "Untitled market",
          label: market.groupItemTitle ?? market.question ?? "Unknown",
          eventSlug,
          yesPrice,
          volume: Number(market.volume ?? 0),
          liquidity: Number(market.liquidity ?? 0),
          clobTokenIds: parseJsonArray(market.clobTokenIds),
          active: market.active,
          closed: market.closed,
          closedTime: normalizeTimestamp(market.closedTime),
          endDate: normalizeTimestamp(market.endDate),
          resolvedOutcome: resolveClosedOutcome(yesPrice, market.closed),
        };
      })
      .filter((market) => market.slug && market.clobTokenIds.length > 0);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPolymarketPrices({
  markets,
  slugMap,
  timeoutMs = 12_000,
}: {
  markets: MarketDefinition[];
  slugMap?: Partial<Record<MarketId, string>>;
  timeoutMs?: number;
}): Promise<LiveMarketPrice[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      Accept: "application/json",
    };

    const settled = await Promise.allSettled(
      markets.map(async (market) => {
        const payload = await fetchGammaMarketForMarket(market, slugMap, controller.signal);
        const yesPrice = resolveYesPrice(payload);

        return {
          contractId: String(payload.id ?? market.id),
          bucket: market.id,
          yesPrice,
          fetchedAt: new Date(),
          volume: Number(payload.volume ?? 0),
          liquidity: Number(payload.liquidity ?? 0),
          sourceLabel: "Polymarket live",
          slug: payload.slug ?? DEFAULT_MARKET_SLUGS[market.id],
          active: payload.active,
          closed: payload.closed,
          closedTime: normalizeTimestamp(payload.closedTime),
          endDate: normalizeTimestamp(payload.endDate),
          resolvedOutcome: resolveClosedOutcome(yesPrice, payload.closed),
        } satisfies LiveMarketPrice;
      }),
    );

    const results = settled.flatMap((result, index) => {
      if (result.status === "fulfilled") return [result.value];
      console.warn(`Polymarket live price unavailable for ${markets[index]?.id ?? "unknown bucket"}.`, result.reason);
      return [];
    });

    if (results.length === 0) {
      throw new Error("All Polymarket live price requests failed.");
    }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPolymarketHistory({
  market,
  slugMap,
  interval = "max",
  fidelity = 1440,
  timeoutMs = 12_000,
}: {
  market: MarketDefinition;
  slugMap?: Partial<Record<MarketId, string>>;
  interval?: string;
  fidelity?: number;
  timeoutMs?: number;
}): Promise<LiveMarketHistoryPoint[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = await fetchGammaMarketForMarket(market, slugMap, controller.signal);
    const outcomes = parseJsonArray(payload.outcomes);
    const tokenIds = parseJsonArray(payload.clobTokenIds);
    const yesIndex = outcomes.findIndex((outcome) => String(outcome).toLowerCase() === "yes");
    const yesToken = yesIndex >= 0 ? tokenIds[yesIndex] : tokenIds[0];

    if (!yesToken) {
      throw new Error(`No YES token found for ${market.id}`);
    }

    const response = await fetch(
      `https://clob.polymarket.com/prices-history?market=${yesToken}&interval=${interval}&fidelity=${fidelity}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Polymarket history request failed for ${market.id}: ${response.status}`);
    }

    const historyPayload = (await response.json()) as {
      history?: Array<{ t: number; p: number }>;
    };

    return (historyPayload.history ?? []).map((point) => ({
      bucket: market.id,
      timestamp: new Date(point.t * 1000).toISOString(),
      yesPrice: clampPrice(point.p),
      sourceLabel: "Polymarket CLOB history",
      slug: payload.slug ?? DEFAULT_MARKET_SLUGS[market.id],
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPolymarketHistoryForEventMarket({
  market,
  interval = "max",
  fidelity = 1440,
  timeoutMs = 12_000,
}: {
  market: PolymarketEventMarket;
  interval?: string;
  fidelity?: number;
  timeoutMs?: number;
}): Promise<EventMarketHistoryPoint[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const yesToken = market.clobTokenIds[0];
    if (!yesToken) {
      throw new Error(`No YES token found for ${market.slug}`);
    }

    const response = await fetch(
      `https://clob.polymarket.com/prices-history?market=${yesToken}&interval=${interval}&fidelity=${fidelity}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Polymarket history request failed for ${market.slug}: ${response.status}`);
    }

    const historyPayload = (await response.json()) as {
      history?: Array<{ t: number; p: number }>;
    };

    return (historyPayload.history ?? []).map((point) => ({
      marketId: market.id,
      label: market.label,
      timestamp: new Date(point.t * 1000).toISOString(),
      yesPrice: clampPrice(point.p),
      sourceLabel: "Polymarket CLOB history",
      slug: market.slug,
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export function toMarketSnapshots(
  livePrices: LiveMarketPrice[],
  fallbackSnapshots: MarketSnapshot[],
): MarketSnapshot[] {
  const liveByBucket = new Map(livePrices.map((price) => [price.bucket, price]));

  return fallbackSnapshots.map((fallback) => {
    const price = liveByBucket.get(fallback.marketId);
    if (!price) return fallback;

    return {
      marketId: price.bucket,
      timestamp: price.fetchedAt.toISOString(),
      yesPrice: price.yesPrice,
      noPrice: clampPrice(1 - price.yesPrice),
      volume: Math.round(price.volume ?? fallback?.volume ?? 0),
      volatility: fallback?.volatility ?? 0.2,
    };
  });
}

export function appendLiveHistory(
  existingHistory: MarketHistoryPoint[],
  livePrices: LiveMarketPrice[],
): MarketHistoryPoint[] {
  const appended = [
    ...existingHistory,
    ...livePrices.map((price) => ({
      marketId: price.bucket,
      timestamp: price.fetchedAt.toISOString(),
      yesPrice: price.yesPrice,
      noPrice: clampPrice(1 - price.yesPrice),
      volume: price.volume,
      spread: undefined,
      sourceLabel: price.sourceLabel,
      note: `Live Polymarket update for ${price.slug}.`,
    })),
  ];

  const deduped = new Map<string, MarketHistoryPoint>();
  for (const point of appended) {
    deduped.set(`${point.marketId}:${point.timestamp}`, point);
  }

  return Array.from(deduped.values()).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export function mergeLiveHistory(
  existingHistory: MarketHistoryPoint[],
  liveHistory: LiveMarketHistoryPoint[],
  livePrices: LiveMarketPrice[] = [],
): MarketHistoryPoint[] {
  const merged = [
    ...existingHistory,
    ...liveHistory.map((point) => ({
      marketId: point.bucket,
      timestamp: point.timestamp,
      yesPrice: point.yesPrice,
      noPrice: clampPrice(1 - point.yesPrice),
      volume: undefined,
      spread: undefined,
      sourceLabel: point.sourceLabel,
      note: `Live Polymarket history for ${point.slug}.`,
    })),
    ...livePrices.map((price) => ({
      marketId: price.bucket,
      timestamp: price.fetchedAt.toISOString(),
      yesPrice: price.yesPrice,
      noPrice: clampPrice(1 - price.yesPrice),
      volume: price.volume,
      spread: undefined,
      sourceLabel: price.sourceLabel,
      note: `Live Polymarket update for ${price.slug}.`,
    })),
  ];

  const deduped = new Map<string, MarketHistoryPoint>();
  for (const point of merged) {
    deduped.set(`${point.marketId}:${point.timestamp}`, point);
  }

  return Array.from(deduped.values()).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}
