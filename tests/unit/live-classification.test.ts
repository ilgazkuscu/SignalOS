import { describe, expect, it } from "vitest";
import { classifyLiveEvent, deriveSignalsFromLiveEvents } from "@/lib/timeline/classify-live-events";
import type { SourceEvent } from "@/lib/types/domain";

describe("live event classification", () => {
  it("maps Trump China trip cancellation into a leader schedule disruption signal", () => {
    const event: SourceEvent = {
      id: "evt-schedule-1",
      sourceId: "nyt",
      title: "Trump cancels China trip as Iran crisis consumes schedule",
      body: "The White House scrapped a planned China visit while officials focused on the Iran crisis and possible next military decisions.",
      occurredAt: "2026-04-11T12:00:00Z",
      status: "verified",
      confidence: 0.6,
      extractionMethod: "test",
      rawPayload: {},
      tags: ["iran", "trump"],
    };

    const classified = classifyLiveEvent(event);
    const signal = deriveSignalsFromLiveEvents([classified])[0];

    expect(classified.liveClassification?.inferredFamily).toBe("leaderSchedule");
    expect(classified.liveClassification?.category).toBe("strategic_analysis");
    expect(signal?.family).toBe("leaderSchedule");
    expect(signal?.direction).toBe("pro_no");
    expect(signal?.derivedFeatures.qualifiesYesProbability).toBeLessThan(0.1);
    expect(signal?.derivedFeatures.announcementScore).toBeGreaterThan(0.15);
    expect(signal?.rawPayload.statementQualifiesYesProbability).toBeDefined();
  });
});
