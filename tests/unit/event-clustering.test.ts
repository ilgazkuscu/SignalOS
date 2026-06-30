import { describe, expect, it } from "vitest";
import { clusterSourceEvents } from "@/lib/intelligence/event-clustering";
import type { SourceEvent } from "@/lib/types/domain";

describe("event clustering ranking", () => {
  it("prefers fresh reported news over older strategic analysis", () => {
    const events: SourceEvent[] = [
      {
        id: "analysis-1",
        sourceId: "foreign-affairs",
        title: "A Test of Wills in Iran",
        body: "Strategic analysis on the regional standoff.",
        occurredAt: "2026-04-14T04:00:00.000Z",
        status: "verified",
        confidence: 0.7,
        extractionMethod: "test",
        rawPayload: {},
        tags: ["iran"],
        liveClassification: {
          category: "strategic_analysis",
          impacts: ["both"],
          relevanceScore: 0.52,
          inferredFamily: "manualJudgment",
          rationale: "Analysis context.",
        },
      },
      {
        id: "reported-1",
        sourceId: "bbc",
        title: "US blockade of Iran ports irresponsible and dangerous, China says",
        body: "Fresh reported development on the same day.",
        occurredAt: "2026-04-14T14:18:04.000Z",
        status: "verified",
        confidence: 0.72,
        extractionMethod: "test",
        rawPayload: {},
        tags: ["iran", "china"],
        liveClassification: {
          category: "diplomatic_channel",
          impacts: ["both"],
          relevanceScore: 0.78,
          inferredFamily: "diplomaticChannels",
          rationale: "Fresh diplomatic reporting.",
        },
      },
    ];

    const clusters = clusterSourceEvents(events);

    expect(clusters[0]?.canonicalTitle).toContain("US blockade");
  });
});
