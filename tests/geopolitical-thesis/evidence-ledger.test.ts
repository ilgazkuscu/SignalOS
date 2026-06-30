import { describe, expect, it } from "vitest";
import { addEvidence, deduplicateEvidence, scoreEvidence } from "@/lib/geopolitical-thesis/evidence-ledger";
import type { EvidenceItem } from "@/lib/geopolitical-thesis/types";

const base: EvidenceItem = {
  id: "a",
  timestamp: Date.now(),
  source: "Reuters",
  headline: "Trump-Xi trip timing appears likely to slip",
  summary: "Reported scheduling friction around the trip.",
  factuality_level: "reported",
  confidence: 0.7,
  entities: ["Trump", "Xi"],
  supports_hypotheses: ["H1"],
  weakens_hypotheses: [],
};

describe("evidence ledger", () => {
  it("deduplicates similar headlines", () => {
    const deduped = deduplicateEvidence([
      base,
      { ...base, id: "b", headline: "Trump Xi trip timing likely to slip", confidence: 0.8 },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.confidence).toBe(0.8);
  });

  it("scores evidence with credibility and recency adjustments", () => {
    const scored = scoreEvidence(base, base.timestamp);
    expect(scored.confidence).toBeGreaterThan(0.7);
    expect(scored.confidence).toBeLessThanOrEqual(1);
  });

  it("adds evidence without mutating the original list", () => {
    const list = [base];
    const next = addEvidence(list, { ...base, id: "c", headline: "Hormuz risk rises", supports_hypotheses: ["H2"] }, base.timestamp);
    expect(list).toHaveLength(1);
    expect(next.length).toBeGreaterThanOrEqual(1);
  });
});
