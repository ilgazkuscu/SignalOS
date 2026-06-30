import { createHash } from "node:crypto";
import { appEnv } from "@/lib/config/env";
import { logNewsEvent } from "@/lib/news/logger";
import { updateSourceState } from "@/lib/news/store";
import type { NewsSourceConfig } from "@/lib/news/source-registry";

export type ConditionalFetchResult = {
  status: number;
  notModified: boolean;
  body?: string;
  etag?: string;
  lastModified?: string;
  contentHash?: string;
  checkedAt: string;
};

type FetchState = {
  etag?: string;
  lastModified?: string;
  contentHash?: string;
  failureCount?: number;
  lastChangedAt?: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function conditionalFetch(source: NewsSourceConfig, state: FetchState): Promise<ConditionalFetchResult> {
  const checkedAt = new Date().toISOString();
  const headers: Record<string, string> = {
    "User-Agent": "ProjectZero/1.0 live-intel",
    Accept: source.adapter === "rss" ? "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8" : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  if (state.etag) headers["If-None-Match"] = state.etag;
  if (state.lastModified) headers["If-Modified-Since"] = state.lastModified;

  logNewsEvent("info", "refresh_started", { sourceId: source.id, url: source.url, adapter: source.adapter });
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt <= appEnv.LIVE_FETCH_RETRY_COUNT; attempt += 1) {
    const timeout = timeoutSignal(appEnv.LIVE_FETCH_TIMEOUT_MS);
    try {
      response = await fetch(source.url, {
        headers,
        cache: "no-store",
        signal: timeout.signal,
      });
      break;
    } catch (error) {
      lastError = error;
      logNewsEvent("warn", "refresh_retry", {
        sourceId: source.id,
        attempt: attempt + 1,
        maxAttempts: appEnv.LIVE_FETCH_RETRY_COUNT + 1,
        error: String(error),
      });
      if (attempt < appEnv.LIVE_FETCH_RETRY_COUNT) {
        await sleep(appEnv.LIVE_FETCH_RETRY_BACKOFF_MS * (attempt + 1));
      }
    } finally {
      timeout.clear();
    }
  }

  if (!response) {
    await updateSourceState(source.id, {
      lastCheckedAt: checkedAt,
      lastFailureAt: checkedAt,
      failureCount: (state.failureCount ?? 0) + 1,
    });
    logNewsEvent("error", "refresh_failed", { sourceId: source.id, error: String(lastError) });
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  if (response.status === 304) {
    await updateSourceState(source.id, {
      lastCheckedAt: checkedAt,
      lastStatus: 304,
      lastSuccessAt: checkedAt,
    });
    logNewsEvent("info", "refresh_skipped_unchanged", { sourceId: source.id, status: 304 });
    return {
      status: 304,
      notModified: true,
      checkedAt,
      etag: state.etag,
      lastModified: state.lastModified,
      contentHash: state.contentHash,
    };
  }

  const body = await response.text();
  const contentHash = sha256(body);
  const notModified = Boolean(state.contentHash && state.contentHash === contentHash);

  await updateSourceState(source.id, {
    etag: response.headers.get("etag") ?? state.etag,
    lastModified: response.headers.get("last-modified") ?? state.lastModified,
    lastCheckedAt: checkedAt,
    lastChangedAt: notModified ? state.lastChangedAt : checkedAt,
    lastSuccessAt: response.ok ? checkedAt : undefined,
    lastFailureAt: response.ok ? undefined : checkedAt,
    lastStatus: response.status,
    contentHash,
    failureCount: response.ok ? 0 : (state.failureCount ?? 0) + 1,
  });
  logNewsEvent(response.ok ? "info" : "warn", notModified ? "refresh_noop" : "refresh_succeeded", {
    sourceId: source.id,
    status: response.status,
    changed: !notModified,
  });

  return {
    status: response.status,
    notModified,
    body,
    checkedAt,
    etag: response.headers.get("etag") ?? state.etag,
    lastModified: response.headers.get("last-modified") ?? state.lastModified,
    contentHash,
  };
}
