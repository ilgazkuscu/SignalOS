import { appEnv } from "@/lib/config/env";
import { buildNarrativeTrends, buildNewsSummary, clusterSourceEvents } from "@/modules/intelligence";
import { conditionalFetch } from "@/lib/news/fetch-client";
import { refreshModelFromNewsUpdates } from "@/lib/news/model-refresh";
import { getNewsSourceRegistry, type NewsSourceConfig } from "@/lib/news/source-registry";
import { getDueSources } from "@/lib/news/scheduler";
import { appendNewsUpdates, readNewsStore } from "@/lib/news/store";
import { classifyLiveEvent, deriveSignalsFromLiveEvents } from "@/lib/timeline/classify-live-events";
import { isMajorEvent } from "@/lib/timeline/major-event-annotations";
import type { SourceEvent, TimelinePayload } from "@/lib/types/domain";

type CacheShape = {
  events: SourceEvent[];
  coverage: TimelinePayload["sourceCoverage"];
  fetchedAt: number;
  lastFetchAttemptAt: string;
  lastSuccessfulFetchAt?: string;
};

type ArticleContext = {
  excerpt: string;
  keyQuote?: string;
};

type AdapterFetchResult = {
  events: SourceEvent[];
  coverage: TimelinePayload["sourceCoverage"][number];
};

type LiveTimelineOverlay = {
  freshness: TimelinePayload["freshness"];
  events: SourceEvent[];
  clusters: TimelinePayload["clusters"];
  newsSummary: TimelinePayload["newsSummary"];
  narrativeTrends: TimelinePayload["narrativeTrends"];
  derivedSignals: SourceEvent[] extends never ? never : ReturnType<typeof deriveSignalsFromLiveEvents>;
  catalystFeed: NonNullable<TimelinePayload["catalystFeed"]>;
  sourceCoverage: TimelinePayload["sourceCoverage"];
};

type LiveTimelineOptions = {
  forceRefresh?: boolean;
  onlyDueSources?: boolean;
  preferCached?: boolean;
};

const PRIMARY_KEYWORDS = [
  "iran",
  "iranian",
  "tehran",
  "hormuz",
  "strait of hormuz",
  "persian gulf",
  "israel and lebanon",
  "iaea",
  "safeguards",
  "verification",
];

const CONTEXT_KEYWORDS = [
  "trump",
  "military",
  "operation",
  "operations",
  "ceasefire",
  "pentagon",
  "diplomacy",
  "strike",
  "blockade",
  "talks",
  "negotiat",
  "proxy",
  "missile",
  "ports",
  "shipping",
  "oil",
  "white house",
  "department of defense",
  "dod",
  "board of governors",
  "grossi",
  "nuclear",
];

function isRelevantLiveItem(text: string, strict = false) {
  const lower = text.toLowerCase();
  if (PRIMARY_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
  if (strict) return false;
  const contextMatches = CONTEXT_KEYWORDS.filter((keyword) => lower.includes(keyword)).length;
  return contextMatches >= 2 && /(middle east|gulf|israel|lebanon|china)/.test(lower);
}

declare global {
  var __iranOpsTimelineCache: CacheShape | undefined;
  var __iranOpsArticleCache: Record<string, ArticleContext> | undefined;
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value: string) {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function extractEntries(xml: string) {
  const itemMatches = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => match[0]);
  if (itemMatches.length > 0) return itemMatches;
  return Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((match) => match[0]);
}

function extractMetaContent(html: string, matcher: RegExp) {
  const match = html.match(matcher);
  return match ? stripTags(match[1]) : "";
}

function extractParagraphs(html: string) {
  return Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripTags(match[1]))
    .filter((paragraph) => paragraph.length > 60 && !paragraph.toLowerCase().includes("cookie"));
}

function extractKeyQuote(paragraphs: string[]) {
  return (
    paragraphs.find((paragraph) => /operations|iran|ceasefire|strike|diplom|pentagon|trump|military/i.test(paragraph)) ??
    paragraphs[0]
  );
}

function absolutizeUrl(baseUrl: string, maybeRelative: string) {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

function extractPageListings(html: string, baseUrl: string, strict = false) {
  return Array.from(html.matchAll(/<(article|section|li|div)[^>]*>([\s\S]{120,2500}?)<\/\1>/gi))
    .map((match) => match[2])
    .map((block) => {
      const title =
        block.match(/<h[1-4][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h[1-4]>/i)?.[1] ||
        extractTag(block, "h2") ||
        extractTag(block, "h3") ||
        extractTag(block, "h4");
      const href =
        block.match(/<a[^>]+href="([^"]+)"/i)?.[1] ||
        "";
      const occurredAt =
        block.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] ||
        block.match(/\b([A-Z][a-z]+ \d{1,2}, \d{4})\b/)?.[1];
      const paragraphs = extractParagraphs(block).slice(0, 1);
      const body = paragraphs.join(" ").trim() || stripTags(title);
      if (!title || !href) return null;
      if (!isRelevantLiveItem(`${title} ${body}`, strict)) return null;

      return {
        title: stripTags(title),
        body,
        occurredAt,
        link: absolutizeUrl(baseUrl, href),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.title === item.title && candidate.link === item.link) === index)
    .slice(0, 10);
}

export function extractLiveBlogUpdates(html: string) {
  const updateBlocks = Array.from(
    html.matchAll(/<(article|section|div)[^>]*>([\s\S]{120,1800}?)<\/\1>/gi),
  )
    .map((match) => match[2])
    .map((block) => {
      const title =
        extractTag(block, "h2") ||
        extractTag(block, "h3") ||
        extractTag(block, "strong");
      const occurredAt =
        block.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] ||
        block.match(/data-timestamp="([^"]+)"/i)?.[1];
      const paragraphs = extractParagraphs(block).slice(0, 3);
      const body = paragraphs.join(" ").trim();
      const combined = `${title} ${body}`.toLowerCase();
      if (!title || !body) return null;
      if (!isRelevantLiveItem(combined)) return null;

      return {
        title,
        body,
        occurredAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return dedupeUpdates(updateBlocks).slice(0, 12);
}

function dedupeUpdates(updates: Array<{ title: string; body: string; occurredAt?: string }>) {
  const byKey = new Map<string, { title: string; body: string; occurredAt?: string }>();
  for (const update of updates) {
    byKey.set(`${update.title}:${update.body.slice(0, 80)}`, update);
  }
  return Array.from(byKey.values());
}

async function fetchArticleContext(link: string): Promise<ArticleContext | null> {
  if (!link) return null;

  globalThis.__iranOpsArticleCache ??= {};
  if (globalThis.__iranOpsArticleCache[link]) {
    return globalThis.__iranOpsArticleCache[link];
  }

  const timeout = timeoutSignal(2_500);
  try {
    const response = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!response.ok) return null;
    const html = await response.text();
    const metaDescription =
      extractMetaContent(html, /<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
      extractMetaContent(html, /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
    const paragraphs = extractParagraphs(html).slice(0, 4);
    const excerpt = [metaDescription, ...paragraphs].filter(Boolean).join(" ").trim();
    if (!excerpt) return null;

    const context = { excerpt, keyQuote: extractKeyQuote(paragraphs) };
    globalThis.__iranOpsArticleCache[link] = context;
    return context;
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function entryToEvent(source: NewsSourceConfig, block: string, index: number, hydrateArticle: boolean): Promise<SourceEvent | null> {
  const title = extractTag(block, "title");
  const body = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content");
  const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
  const link =
    block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ||
    block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
    "";

  const combined = `${title} ${body}`.toLowerCase();
  if (!title || !isRelevantLiveItem(combined)) return null;

  const occurredAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
  const articleContext = hydrateArticle ? await fetchArticleContext(link) : null;
  return {
    id: `live-${source.id}-${occurredAt}-${index}`,
    sourceId: source.sourceId,
    title,
    body: body || "Live feed headline captured without summary text.",
    occurredAt,
    status: "verified",
    confidence: 0.72,
    extractionMethod: "rss_live_ingestion",
    rawPayload: {
      feed: source.url,
      link,
      articleExcerpt: articleContext?.excerpt,
      keyQuote: articleContext?.keyQuote,
    },
    tags: [source.category, "live-feed", ...PRIMARY_KEYWORDS.filter((keyword) => combined.includes(keyword)), ...CONTEXT_KEYWORDS.filter((keyword) => combined.includes(keyword))].slice(0, 8),
  };
}

function baseCoverage(source: NewsSourceConfig): TimelinePayload["sourceCoverage"][number] {
  return {
    key: source.id,
    label: source.name,
    category: source.category,
    status: "error",
    note: "",
    url: source.url,
    adapter: source.adapter,
    refreshIntervalMs: appEnv.LIVE_TIMELINE_SOURCE_TTL_MS,
  };
}

async function fetchRssSource(source: NewsSourceConfig): Promise<AdapterFetchResult> {
  const attemptedAt = new Date().toISOString();
  const store = await readNewsStore();
  const result = await conditionalFetch(source, store.sources[source.id] ?? { failureCount: 0 });
  if (!result.body || result.notModified) {
    return {
      events: [],
      coverage: {
        ...baseCoverage(source),
        status: result.notModified ? "stale" : "error",
        note: result.notModified ? "Source unchanged since last successful fetch." : `Source fetch returned ${result.status}.`,
        lastFetchAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: store.sources[source.id]?.lastChangedAt,
        itemsConsidered: 0,
        relevantItems: 0,
      },
    };
  }
  try {
    const xml = result.body;
    const rawEntries = extractEntries(xml).slice(0, 8);
    const hydrateLimit =
      appEnv.LIVE_TIMELINE_ARTICLE_FETCH_LIMIT <= 0
        ? 0
        : Math.max(1, Math.floor(appEnv.LIVE_TIMELINE_ARTICLE_FETCH_LIMIT / Math.max(getNewsSourceRegistry().length, 1)));
    const events = (
      await Promise.all(rawEntries.map((block, index) => entryToEvent(source, block, index, index < hydrateLimit)))
    )
      .filter((event): event is SourceEvent => Boolean(event))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 6);

    return {
      events,
      coverage: {
        ...baseCoverage(source),
        status: "live",
        latestAt: events[0]?.occurredAt,
        note: events.length
          ? `${events.length} relevant item(s) matched the current geopolitical filter.`
          : "Feed responded, but no relevant items matched the current geopolitical filter.",
        lastFetchAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: attemptedAt,
        relevantItems: events.length,
        itemsConsidered: rawEntries.length,
      },
    };
  } finally {
  }
}

async function fetchPageSource(source: NewsSourceConfig): Promise<AdapterFetchResult> {
  const attemptedAt = new Date().toISOString();
  const store = await readNewsStore();
  const result = await conditionalFetch(source, store.sources[source.id] ?? { failureCount: 0 });
  if (!result.body || result.notModified) {
    return {
      events: [],
      coverage: {
        ...baseCoverage(source),
        status: result.notModified ? "stale" : "error",
        note: result.notModified ? "Source unchanged since last successful fetch." : `Source fetch returned ${result.status}.`,
        lastFetchAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: store.sources[source.id]?.lastChangedAt,
        itemsConsidered: 0,
        relevantItems: 0,
      },
    };
  }
  try {
    const html = result.body;
    const pageTitle =
      extractMetaContent(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
      extractTag(html, "title") ||
      source.name;
    const strictSource = source.category === "official" || source.category === "think_tank";
    const listingUpdates = extractPageListings(html, source.url, strictSource);
    const updates = extractLiveBlogUpdates(html);
    const structuredUpdates = updates.length
      ? updates.map((update) => ({
          title: `${pageTitle}: ${update.title}`,
          body: update.body,
          occurredAt: update.occurredAt,
          link: source.url,
        }))
      : listingUpdates;
    const events = structuredUpdates.length
      ? structuredUpdates.map((update, index) => ({
          id: `live-${source.id}-${index}-${update.occurredAt ?? attemptedAt}`,
          sourceId: source.sourceId,
          title: update.title,
          body: update.body,
          occurredAt: update.occurredAt ? new Date(update.occurredAt).toISOString() : attemptedAt,
          status: "verified" as const,
          confidence: 0.68,
          extractionMethod: source.url.includes("/live-blog/") ? "page_live_blog_ingestion" : "page_ingestion",
          rawPayload: {
            link: update.link,
            pageTitle,
          },
          tags: [
                source.category,
                "direct-page",
                ...PRIMARY_KEYWORDS.filter((keyword) => `${update.title} ${update.body}`.toLowerCase().includes(keyword)),
                ...CONTEXT_KEYWORDS.filter((keyword) => `${update.title} ${update.body}`.toLowerCase().includes(keyword)),
              ].slice(0, 8),
        }))
      : (() => {
          const paragraphs = extractParagraphs(html).slice(0, 3);
          const excerpt = paragraphs.join(" ").trim();
          if (!excerpt || !isRelevantLiveItem(`${pageTitle} ${excerpt}`, strictSource)) return [];
          return [
            {
              id: `live-${source.id}-${attemptedAt}`,
              sourceId: source.sourceId,
              title: pageTitle,
              body: excerpt,
              occurredAt: attemptedAt,
              status: "verified" as const,
              confidence: 0.62,
              extractionMethod: "page_summary_ingestion",
              rawPayload: { link: source.url },
              tags: [source.category, "direct-page"].slice(0, 8),
            },
          ];
        })();

    return {
      events,
      coverage: {
        ...baseCoverage(source),
        status: events.length ? "live" : "stale",
        latestAt: events[0]?.occurredAt,
        note: events.length
          ? `${events.length} structured update(s) were extracted from the source page.`
          : "The page was fetched, but no structured relevant updates could be extracted.",
        lastFetchAttemptAt: attemptedAt,
        lastSuccessfulFetchAt: attemptedAt,
        relevantItems: events.length,
        itemsConsidered: Math.max(updates.length, 1),
      },
    };
  } catch (error) {
    return {
      events: [],
      coverage: {
        ...baseCoverage(source),
        status: "error",
        note: `Page parse failed. ${String(error)}`,
        lastFetchAttemptAt: attemptedAt,
      },
    };
  }
}

async function fetchSource(source: NewsSourceConfig) {
  return source.adapter === "rss" ? fetchRssSource(source) : fetchPageSource(source);
}

export async function getLiveTimelineOverlay(
  fallbackEvents: SourceEvent[],
  options: LiveTimelineOptions = {},
): Promise<LiveTimelineOverlay> {
  const refreshIntervalMs = appEnv.LIVE_TIMELINE_SOURCE_TTL_MS;
  const now = Date.now();
  if (!appEnv.LIVE_TIMELINE_ENABLED) {
    const clusters = clusterSourceEvents(fallbackEvents);
    return {
      freshness: {
        cacheAgeMs: 0,
        refreshIntervalMs,
        usingCachedData: false,
      },
      events: fallbackEvents,
      clusters,
      newsSummary: buildNewsSummary(clusters),
      narrativeTrends: buildNarrativeTrends(clusters),
      derivedSignals: [],
      catalystFeed: [],
      sourceCoverage: getNewsSourceRegistry().map((source) => ({
        ...baseCoverage(source),
        status: "fallback",
        note: "Live timeline disabled. Using fixture-only timeline.",
      })),
    };
  }

  const cached = globalThis.__iranOpsTimelineCache;
  if (!options.forceRefresh && cached && now - cached.fetchedAt < refreshIntervalMs) {
    const events = mergeEvents(fallbackEvents, cached.events);
    const clusters = clusterSourceEvents(events);
    const cacheAgeMs = now - cached.fetchedAt;
    return {
      freshness: {
        cacheAgeMs,
        refreshIntervalMs,
        lastFetchAttemptAt: cached.lastFetchAttemptAt,
        lastSuccessfulFetchAt: cached.lastSuccessfulFetchAt,
        usingCachedData: true,
      },
      events,
      clusters,
      newsSummary: buildNewsSummary(clusters),
      narrativeTrends: buildNarrativeTrends(clusters),
      derivedSignals: deriveSignalsFromLiveEvents(events),
      catalystFeed: buildCatalystFeed(events),
      sourceCoverage: cached.coverage.map((coverage) => ({
        ...coverage,
        cacheAgeMs,
      })) as TimelinePayload["sourceCoverage"],
    };
  }

  if (options.preferCached) {
    const events = mergeEvents(fallbackEvents, cached?.events ?? []);
    const clusters = clusterSourceEvents(events);
    const cacheAgeMs = cached ? now - cached.fetchedAt : 0;
    return {
      freshness: {
        cacheAgeMs,
        refreshIntervalMs,
        lastFetchAttemptAt: cached?.lastFetchAttemptAt,
        lastSuccessfulFetchAt: cached?.lastSuccessfulFetchAt,
        usingCachedData: true,
      },
      events,
      clusters,
      newsSummary: buildNewsSummary(clusters),
      narrativeTrends: buildNarrativeTrends(clusters),
      derivedSignals: deriveSignalsFromLiveEvents(events),
      catalystFeed: buildCatalystFeed(events),
      sourceCoverage: cached
        ? cached.coverage.map((coverage) => ({ ...coverage, cacheAgeMs })) as TimelinePayload["sourceCoverage"]
        : getNewsSourceRegistry().map((source) => ({
            ...baseCoverage(source),
            status: "fallback",
            note: "Initial page render is using fixture timeline data. The API refresh path will fetch live source updates.",
          })),
    };
  }

  const lastFetchAttemptAt = new Date().toISOString();
  const store = await readNewsStore();
  const dueSources = getDueSources(store.sources, now);
  const sources = options.onlyDueSources
    ? dueSources.filter((source) => new Date(source.nextPollDueAt).getTime() <= now)
    : getNewsSourceRegistry();
  if (options.onlyDueSources && sources.length === 0) {
    const events = mergeEvents(fallbackEvents, cached?.events ?? []);
    const clusters = clusterSourceEvents(events);
    return {
      freshness: {
        cacheAgeMs: cached ? now - cached.fetchedAt : 0,
        refreshIntervalMs,
        lastFetchAttemptAt: cached?.lastFetchAttemptAt,
        lastSuccessfulFetchAt: cached?.lastSuccessfulFetchAt,
        usingCachedData: true,
      },
      events,
      clusters,
      newsSummary: buildNewsSummary(clusters),
      narrativeTrends: buildNarrativeTrends(clusters),
      derivedSignals: deriveSignalsFromLiveEvents(events),
      catalystFeed: buildCatalystFeed(events),
      sourceCoverage: cached?.coverage ?? [],
    };
  }
  const settled = await Promise.allSettled(sources.map((source) => fetchSource(source)));
  const liveEvents: SourceEvent[] = [];
  const sourceCoverage: TimelinePayload["sourceCoverage"] = [];

  settled.forEach((result, index) => {
    const source = sources[index];
    if (result.status === "fulfilled") {
      liveEvents.push(...result.value.events);
      sourceCoverage.push(result.value.coverage);
    } else {
      sourceCoverage.push({
        ...baseCoverage(source),
        status: "error",
        note: `Live source unavailable. ${String(result.reason)}`,
        lastFetchAttemptAt,
      });
    }
  });

  const lastSuccessfulFetchAt = sourceCoverage.some((coverage) => coverage.status === "live" || coverage.status === "stale")
    ? lastFetchAttemptAt
    : cached?.lastSuccessfulFetchAt;

  const classifiedLiveEvents = liveEvents.map((event) => (event.liveClassification ? event : classifyLiveEvent(event)));
  const persistedUpdates = await appendNewsUpdates(
    classifiedLiveEvents.map((event) => ({
      updateId: event.id,
      sourceId: event.sourceId,
      url: String(event.rawPayload.link ?? event.rawPayload.feed ?? ""),
      headline: event.title,
      observedAt: lastFetchAttemptAt,
      contentHash: JSON.stringify(event.rawPayload),
      modelAffected: isMajorEvent(event),
    })),
  );
  if (persistedUpdates.length) {
    const newlyPersistedMajorEvents = classifiedLiveEvents.filter((event) =>
      persistedUpdates.some((update) => update.updateId === event.id && update.modelAffected),
    );
    if (newlyPersistedMajorEvents.length) {
      await refreshModelFromNewsUpdates(newlyPersistedMajorEvents);
    }
  }

  globalThis.__iranOpsTimelineCache = {
    events: classifiedLiveEvents,
    coverage: sourceCoverage,
    fetchedAt: now,
    lastFetchAttemptAt,
    lastSuccessfulFetchAt,
  };

  const events = mergeEvents(fallbackEvents, classifiedLiveEvents);
  const clusters = clusterSourceEvents(events);
  return {
    freshness: {
      cacheAgeMs: 0,
      refreshIntervalMs,
      lastFetchAttemptAt,
      lastSuccessfulFetchAt,
      usingCachedData: false,
    },
    events,
    clusters,
    newsSummary: buildNewsSummary(clusters),
    narrativeTrends: buildNarrativeTrends(clusters),
    derivedSignals: deriveSignalsFromLiveEvents(events),
    catalystFeed: buildCatalystFeed(events),
    sourceCoverage,
  };
}

export async function runNewsPollCycle() {
  return getLiveTimelineOverlay([], { forceRefresh: true, onlyDueSources: true });
}

function mergeEvents(fallbackEvents: SourceEvent[], liveEvents: SourceEvent[]) {
  const byKey = new Map<string, SourceEvent>();
  const now = Date.now();
  const baseEvents = liveEvents.length > 0 ? liveEvents : fallbackEvents;
  for (const event of baseEvents) {
    if (new Date(event.occurredAt).getTime() > now) continue;
    const classified = event.liveClassification ? event : classifyLiveEvent(event);
    byKey.set(`${classified.sourceId}:${classified.title}:${classified.occurredAt}`, classified);
  }

  return Array.from(byKey.values())
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, 80);
}

function buildCatalystFeed(events: SourceEvent[]): NonNullable<TimelinePayload["catalystFeed"]> {
  return events
    .filter(
      (event) =>
        event.liveClassification &&
        event.liveClassification.relevanceScore >= appEnv.LIVE_TIMELINE_CATALYST_THRESHOLD,
    )
    .sort(
      (left, right) =>
        (right.liveClassification?.relevanceScore ?? 0) - (left.liveClassification?.relevanceScore ?? 0) ||
        right.occurredAt.localeCompare(left.occurredAt),
    )
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      title: event.title,
      occurredAt: event.occurredAt,
      sourceId: event.sourceId,
      category: event.liveClassification!.category,
      relevanceScore: event.liveClassification!.relevanceScore,
      impactPath: event.liveClassification!.impacts.includes("both")
        ? "both"
        : event.liveClassification!.impacts.includes("formal_announcement")
          ? "formal_announcement"
          : "real_end",
      rationale: event.liveClassification!.rationale,
    }));
}
