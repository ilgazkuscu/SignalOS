import { describe, expect, it } from "vitest";
import { buildMajorEventAnnotations, isMajorEvent } from "@/lib/timeline/major-event-annotations";
import { classifyLiveEvent } from "@/lib/timeline/classify-live-events";
import type { SourceEvent } from "@/lib/types/domain";

describe("major event annotations", () => {
  it("captures senior diplomatic travel like a Vance Pakistan visit as a major event", () => {
    const event: SourceEvent = {
      id: "evt-vance-pakistan",
      sourceId: "bbc",
      title: "Vance visited Pakistan for emergency security talks as Iran tensions grew",
      body: "The vice president met officials in Islamabad as backchannel diplomacy intensified around the regional crisis.",
      occurredAt: "2026-04-13T12:00:00Z",
      status: "verified",
      confidence: 0.68,
      extractionMethod: "test",
      rawPayload: {},
      tags: ["vance", "pakistan", "diplomacy"],
    };

    const classified = classifyLiveEvent(event);
    const annotations = buildMajorEventAnnotations([classified]);

    expect(classified.liveClassification?.category).toBe("diplomatic_channel");
    expect(classified.liveClassification?.inferredFamily).toBe("diplomaticChannels");
    expect(isMajorEvent(classified)).toBe(true);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.family).toBe("diplomaticChannels");
  });
});
