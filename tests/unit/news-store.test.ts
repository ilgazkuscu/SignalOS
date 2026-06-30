import { describe, expect, it } from "vitest";
import { appendModelRefreshRun, appendNewsUpdates } from "@/lib/news/store";

describe("news store helpers", () => {
  it("dedupes persisted updates by update id and content hash", async () => {
    const unique = await appendNewsUpdates([
      {
        updateId: "u-1",
        sourceId: "nbc",
        url: "https://example.com",
        headline: "Update",
        observedAt: "2026-04-11T00:00:00.000Z",
        contentHash: "abc",
        modelAffected: true,
      },
      {
        updateId: "u-1",
        sourceId: "nbc",
        url: "https://example.com",
        headline: "Update",
        observedAt: "2026-04-11T00:00:00.000Z",
        contentHash: "abc",
        modelAffected: true,
      },
    ]);

    expect(unique.length).toBeLessThanOrEqual(1);
    await appendModelRefreshRun({
      id: "run-1",
      startedAt: "2026-04-11T00:00:00.000Z",
      finishedAt: "2026-04-11T00:00:01.000Z",
      updatesProcessed: 1,
      status: "completed",
      note: "ok",
    });
  });
});
