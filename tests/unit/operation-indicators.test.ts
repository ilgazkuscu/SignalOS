import { describe, expect, it } from "vitest";
import { buildOperationIndicators } from "@/lib/decision/operation-indicators";
import type { Signal, SourceEvent } from "@/lib/types/domain";

const signal: Signal = {
  id: "sig-tanker",
  family: "strategicFlights",
  type: "flight",
  subtype: "tanker_bridge",
  direction: "pro_no",
  magnitude: -0.7,
  confidence: 0.82,
  occurredAt: "2026-04-10T12:00:00.000Z",
  sourceId: "adsb-fixture",
  sourceEventId: "event-tanker",
  rationale: "KC-135 tanker bridge activity increased toward the region.",
  derivedFeatures: {},
  rawPayload: { aircraft: "KC-135 tanker bridge" },
  extractionMethod: "fixture",
  status: "verified",
  decayHalfLifeHours: 48,
};

const event: SourceEvent = {
  id: "event-rank",
  sourceId: "osint-fixture",
  title: "Senior officer command element arrives in theater",
  body: "A general and command element were reported near the region.",
  occurredAt: "2026-04-10T13:00:00.000Z",
  status: "verified",
  confidence: 0.75,
  extractionMethod: "fixture",
  rawPayload: {},
  tags: ["general", "command element"],
};

describe("operation indicators", () => {
  it("surfaces tanker and rank-mix variables with source provenance", () => {
    const indicators = buildOperationIndicators({ signals: [signal], sourceEvents: [event] });

    const tanker = indicators.find((indicator) => indicator.id === "tanker-bridge");
    const rank = indicators.find((indicator) => indicator.id === "rank-mix-pressure");

    expect(tanker?.value).toBeGreaterThan(0);
    expect(tanker?.sourceLabels).toContain("adsb-fixture");
    expect(rank?.value).toBeGreaterThan(0);
    expect(rank?.sourceLabels).toContain("osint-fixture");
  });
});
