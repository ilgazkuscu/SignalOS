import { appEnv } from "@/lib/config/env";
import type { TimelinePayload } from "@/lib/types/domain";

export type NewsSourceType = "live_blog" | "article_feed" | "rss" | "api" | "official";
export type NewsSourceAdapter = "rss" | "page";

export type NewsSourceConfig = {
  id: string;
  name: string;
  url: string;
  type: NewsSourceType;
  pollIntervalSeconds: number;
  adapter: NewsSourceAdapter;
  priority: number;
  enabled: boolean;
  tags: string[];
  maxRequestsPerHour: number;
  sourceId: string;
  category: TimelinePayload["sourceCoverage"][number]["category"];
};

const BASE_SOURCES: NewsSourceConfig[] = [
  {
    id: "whitehouse-news",
    name: "White House News",
    url: "https://www.whitehouse.gov/news/",
    type: "official",
    pollIntervalSeconds: 60,
    adapter: "page",
    priority: 3,
    enabled: true,
    tags: ["iran", "white-house", "official"],
    maxRequestsPerHour: 60,
    sourceId: "whitehouse",
    category: "official",
  },
  {
    id: "whitehouse-fact-sheets",
    name: "White House Fact Sheets",
    url: "https://www.whitehouse.gov/fact-sheets/",
    type: "official",
    pollIntervalSeconds: 60,
    adapter: "page",
    priority: 2,
    enabled: true,
    tags: ["iran", "white-house", "official", "fact-sheet"],
    maxRequestsPerHour: 60,
    sourceId: "whitehouse",
    category: "official",
  },
  {
    id: "dod-releases",
    name: "Department of Defense Releases",
    url: "https://www.war.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=9&Site=945&max=10",
    type: "official",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 3,
    enabled: true,
    tags: ["iran", "dod", "official", "releases"],
    maxRequestsPerHour: 60,
    sourceId: "dod",
    category: "official",
  },
  {
    id: "iaea-iran",
    name: "IAEA Iran Monitoring",
    url: "https://www.iaea.org/newscenter/focus/iran",
    type: "official",
    pollIntervalSeconds: 60,
    adapter: "page",
    priority: 2,
    enabled: true,
    tags: ["iran", "iaea", "official", "nuclear"],
    maxRequestsPerHour: 60,
    sourceId: "iaea",
    category: "official",
  },
  {
    id: "nyt-world",
    name: "New York Times World",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    type: "rss",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 2,
    enabled: true,
    tags: ["iran", "world", "news"],
    maxRequestsPerHour: 60,
    sourceId: "nyt",
    category: "newspaper",
  },
  {
    id: "wsj-world",
    name: "Wall Street Journal World",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    type: "rss",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 2,
    enabled: true,
    tags: ["iran", "world", "news"],
    maxRequestsPerHour: 60,
    sourceId: "wsj",
    category: "newspaper",
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    type: "rss",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 2,
    enabled: true,
    tags: ["iran", "world", "news"],
    maxRequestsPerHour: 60,
    sourceId: "bbc",
    category: "broadcaster",
  },
  {
    id: "ft-world",
    name: "Financial Times World",
    url: "https://www.ft.com/world?format=rss",
    type: "rss",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 1,
    enabled: true,
    tags: ["iran", "world", "news"],
    maxRequestsPerHour: 60,
    sourceId: "ft",
    category: "newspaper",
  },
  {
    id: "foreign-affairs",
    name: "Foreign Affairs",
    url: "https://www.foreignaffairs.com/rss.xml",
    type: "rss",
    pollIntervalSeconds: 60,
    adapter: "rss",
    priority: 1,
    enabled: true,
    tags: ["iran", "analysis", "strategy"],
    maxRequestsPerHour: 60,
    sourceId: "foreign-affairs",
    category: "think_tank",
  },
  {
    id: "brookings-iran",
    name: "Brookings Iran",
    url: "https://www.brookings.edu/regions/middle-east-north-africa/iran/",
    type: "article_feed",
    pollIntervalSeconds: 60,
    adapter: "page",
    priority: 1,
    enabled: true,
    tags: ["iran", "analysis", "strategy", "brookings"],
    maxRequestsPerHour: 60,
    sourceId: "brookings",
    category: "think_tank",
  },
  {
    id: "carnegie-iran-search",
    name: "Carnegie Iran Search",
    url: "https://carnegieendowment.org/search?query=iran",
    type: "article_feed",
    pollIntervalSeconds: 60,
    adapter: "page",
    priority: 1,
    enabled: true,
    tags: ["iran", "analysis", "strategy", "carnegie"],
    maxRequestsPerHour: 60,
    sourceId: "carnegie",
    category: "think_tank",
  },
  {
    id: "atlantic-council",
    name: "Atlantic Council",
    url: "https://www.atlanticcouncil.org/feed/",
    type: "rss",
    pollIntervalSeconds: 300,
    adapter: "rss",
    priority: 1,
    enabled: true,
    tags: ["iran", "analysis", "strategy"],
    maxRequestsPerHour: 12,
    sourceId: "atlantic-council",
    category: "think_tank",
  },
];

function inferDirectSource(url: string, index: number): NewsSourceConfig {
  const sourceId = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "").split(".")[0] || `direct-${index + 1}`;
    } catch {
      return `direct-${index + 1}`;
    }
  })();
  const isLiveBlog = url.includes("/live-blog/");
  return {
    id: `direct-${index + 1}`,
    name: isLiveBlog ? "Direct Live Blog" : "Direct Source",
    url,
    type: isLiveBlog ? "live_blog" : "article_feed",
    pollIntervalSeconds: isLiveBlog ? 30 : 60,
    adapter: "page",
    priority: isLiveBlog ? 3 : 1,
    enabled: true,
    tags: ["direct"],
    maxRequestsPerHour: isLiveBlog ? 120 : 60,
    sourceId,
    category: isLiveBlog ? "live_blog" : "broadcaster",
  };
}

export function getNewsSourceRegistry(): NewsSourceConfig[] {
  const direct = (appEnv.LIVE_TIMELINE_DIRECT_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(inferDirectSource);

  return [...BASE_SOURCES, ...direct].filter((source) => source.enabled);
}
