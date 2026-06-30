import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("IRAN OPS ENDGAME ENGINE"),
  APP_ENV: z.string().default("local"),
  POLYMARKET_LIVE_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  POLYMARKET_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  POLYMARKET_MARKET_SLUG_MAP: z.string().optional(),
  LIVE_TIMELINE_ENABLED: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
  LIVE_TIMELINE_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  NEXT_PUBLIC_LIVE_TIMELINE_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  LIVE_TIMELINE_SOURCE_TTL_MS: z.coerce.number().default(60_000),
  LIVE_TIMELINE_ARTICLE_FETCH_LIMIT: z.coerce.number().default(0),
  LIVE_TIMELINE_DIRECT_URLS: z.string().optional(),
  LIVE_FETCH_TIMEOUT_MS: z.coerce.number().default(2_500),
  LIVE_FETCH_RETRY_COUNT: z.coerce.number().default(0),
  LIVE_FETCH_RETRY_BACKOFF_MS: z.coerce.number().default(250),
  LIVE_SCHEDULER_JITTER_MS: z.coerce.number().default(1_500),
  LIVE_TIMELINE_CATALYST_THRESHOLD: z.coerce.number().default(0.72),
  LIVE_ALERT_GAP_THRESHOLD: z.coerce.number().default(0.12),
  LIVE_ALERT_RELEVANCE_THRESHOLD: z.coerce.number().default(0.78),
  FIXTURE_MODE: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
});

export const appEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  APP_ENV: process.env.APP_ENV,
  POLYMARKET_LIVE_ENABLED: process.env.POLYMARKET_LIVE_ENABLED,
  POLYMARKET_POLL_INTERVAL_MS: process.env.POLYMARKET_POLL_INTERVAL_MS,
  NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS: process.env.NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS,
  POLYMARKET_MARKET_SLUG_MAP: process.env.POLYMARKET_MARKET_SLUG_MAP,
  LIVE_TIMELINE_ENABLED: process.env.LIVE_TIMELINE_ENABLED,
  LIVE_TIMELINE_POLL_INTERVAL_MS: process.env.LIVE_TIMELINE_POLL_INTERVAL_MS,
  NEXT_PUBLIC_LIVE_TIMELINE_POLL_INTERVAL_MS: process.env.NEXT_PUBLIC_LIVE_TIMELINE_POLL_INTERVAL_MS,
  LIVE_TIMELINE_SOURCE_TTL_MS: process.env.LIVE_TIMELINE_SOURCE_TTL_MS,
  LIVE_TIMELINE_ARTICLE_FETCH_LIMIT: process.env.LIVE_TIMELINE_ARTICLE_FETCH_LIMIT,
  LIVE_TIMELINE_DIRECT_URLS: process.env.LIVE_TIMELINE_DIRECT_URLS,
  LIVE_FETCH_TIMEOUT_MS: process.env.LIVE_FETCH_TIMEOUT_MS,
  LIVE_FETCH_RETRY_COUNT: process.env.LIVE_FETCH_RETRY_COUNT,
  LIVE_FETCH_RETRY_BACKOFF_MS: process.env.LIVE_FETCH_RETRY_BACKOFF_MS,
  LIVE_SCHEDULER_JITTER_MS: process.env.LIVE_SCHEDULER_JITTER_MS,
  LIVE_TIMELINE_CATALYST_THRESHOLD: process.env.LIVE_TIMELINE_CATALYST_THRESHOLD,
  LIVE_ALERT_GAP_THRESHOLD: process.env.LIVE_ALERT_GAP_THRESHOLD,
  LIVE_ALERT_RELEVANCE_THRESHOLD: process.env.LIVE_ALERT_RELEVANCE_THRESHOLD,
  FIXTURE_MODE: process.env.FIXTURE_MODE,
});

export const appRuntime = {
  repositoryFixtureMode: appEnv.FIXTURE_MODE,
  fixtureOnlyMode: appEnv.FIXTURE_MODE && !appEnv.POLYMARKET_LIVE_ENABLED && !appEnv.LIVE_TIMELINE_ENABLED,
  dataMode: appEnv.FIXTURE_MODE && !appEnv.POLYMARKET_LIVE_ENABLED && !appEnv.LIVE_TIMELINE_ENABLED
    ? "fixture-only"
    : "live/fallback",
};
