import { describe, expect, it } from "vitest";
import { computeNextPollDueAt, computeSchedulerSleepMs, getNextDueSource } from "@/lib/news/scheduler";

describe("news scheduler", () => {
  it("backs off after failures", () => {
    const baseline = computeNextPollDueAt(
      { pollIntervalSeconds: 60 },
      { failureCount: 0, lastCheckedAt: "2026-04-11T00:00:00.000Z" },
      new Date("2026-04-11T00:00:00.000Z").getTime(),
    );
    const backedOff = computeNextPollDueAt(
      { pollIntervalSeconds: 60 },
      { failureCount: 2, lastCheckedAt: "2026-04-11T00:00:00.000Z" },
      new Date("2026-04-11T00:00:00.000Z").getTime(),
    );

    expect(new Date(backedOff).getTime()).toBeGreaterThan(new Date(baseline).getTime());
  });

  it("treats unchecked sources as immediately due", () => {
    const now = new Date("2026-04-11T00:01:00.000Z").getTime();
    const nextDue = getNextDueSource({
      "nyt-world": { failureCount: 0, lastCheckedAt: "2026-04-11T00:00:30.000Z" },
      "foreign-affairs": { failureCount: 0, lastCheckedAt: "2026-04-11T00:00:00.000Z" },
    }, now);

    expect(nextDue).not.toBeNull();
    expect(["nyt-world", "foreign-affairs"]).not.toContain(nextDue?.id);
    expect(new Date(nextDue!.nextPollDueAt).getTime()).toBeLessThanOrEqual(now);
  });

  it("caps scheduler sleep to the next due wait time", () => {
    const now = new Date("2026-04-11T00:00:50.000Z").getTime();
    const sleepMs = computeSchedulerSleepMs(
      {
        "nyt-world": { failureCount: 0, lastCheckedAt: "2026-04-11T00:00:00.000Z" },
      },
      now,
    );

    expect(sleepMs).toBeGreaterThanOrEqual(0);
    expect(sleepMs).toBeLessThanOrEqual(20_000);
  });
});
