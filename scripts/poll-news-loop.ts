import { appEnv } from "../apps/web/src/lib/config/env";
import { computeSchedulerSleepMs, getNextDueSource } from "../apps/web/src/lib/news/scheduler";
import { readNewsStore } from "../apps/web/src/lib/news/store";
import { runNewsPollCycle } from "../apps/web/src/lib/timeline/live-news";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`[live-intel] loop starting at ${new Date().toISOString()}`);
  while (true) {
    try {
      const result = await runNewsPollCycle();
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: "poll_cycle_completed",
        events: result.events.length,
        sources: result.sourceCoverage.length,
        freshness: result.freshness,
      }));
    } catch (error) {
      console.error(JSON.stringify({
        ts: new Date().toISOString(),
        event: "poll_cycle_failed",
        error: String(error),
      }));
    }
    const store = await readNewsStore();
    const now = Date.now();
    const nextDueSource = getNextDueSource(store.sources, now);
    const sleepMs = computeSchedulerSleepMs(store.sources, now);
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      event: "scheduler_sleep_scheduled",
      nextDueSourceId: nextDueSource?.id ?? null,
      nextPollDueAt: nextDueSource?.nextPollDueAt ?? null,
      sleepMs,
      maxSleepMs: appEnv.LIVE_TIMELINE_SOURCE_TTL_MS,
    }));
    await sleep(sleepMs);
  }
}

void main();
