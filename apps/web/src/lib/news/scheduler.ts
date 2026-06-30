import { appEnv } from "@/lib/config/env";
import { getNewsSourceRegistry } from "@/lib/news/source-registry";
import type { PersistedSourceState } from "@/lib/news/store";

export function computeNextPollDueAt(
  source: { pollIntervalSeconds: number },
  state: PersistedSourceState | null | undefined,
  now = Date.now(),
) {
  const baseMs = source.pollIntervalSeconds * 1000;
  const backoffMultiplier = Math.min(4, Math.max(1, (state?.failureCount ?? 0) + 1));
  const jitterMs = Math.min(appEnv.LIVE_SCHEDULER_JITTER_MS, Math.floor(baseMs * 0.15));
  const lastCheckedAt = state?.lastCheckedAt ? new Date(state.lastCheckedAt).getTime() : 0;
  return new Date(lastCheckedAt + baseMs * backoffMultiplier + jitterMs).toISOString();
}

export function getDueSources(states: Record<string, PersistedSourceState> = {}, now = Date.now()) {
  return getNewsSourceRegistry().map((source) => ({
    ...source,
    nextPollDueAt: computeNextPollDueAt(source, states[source.id], now),
  }));
}

export function getNextDueSource(states: Record<string, PersistedSourceState> = {}, now = Date.now()) {
  const dueSources = getDueSources(states, now);
  return dueSources.reduce<(typeof dueSources)[number] | null>((soonest, source) => {
    if (!soonest) return source;
    return new Date(source.nextPollDueAt).getTime() < new Date(soonest.nextPollDueAt).getTime() ? source : soonest;
  }, null);
}

export function computeSchedulerSleepMs(states: Record<string, PersistedSourceState> = {}, now = Date.now()) {
  const nextDueSource = getNextDueSource(states, now);
  if (!nextDueSource) {
    return appEnv.LIVE_TIMELINE_SOURCE_TTL_MS;
  }

  const waitMs = new Date(nextDueSource.nextPollDueAt).getTime() - now;
  return Math.max(0, Math.min(appEnv.LIVE_TIMELINE_SOURCE_TTL_MS, waitMs));
}
