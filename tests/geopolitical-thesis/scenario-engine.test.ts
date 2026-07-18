import { describe, expect, it } from "vitest";
import { computeFeatures } from "@/modules/thesis";
import { computeScenarios } from "@/modules/thesis";
import { runGeopoliticalThesisScoring } from "@/modules/thesis";
import { generateNarrative } from "@/modules/thesis";
import fixture from "../../fixtures/geopolitical-thesis/sample-news.json";
import type { EvidenceItem } from "@/modules/thesis";

describe("scenario engine", () => {
  it("normalizes scenario probabilities", () => {
    const scenarios = computeScenarios(computeFeatures(fixture as EvidenceItem[]));
    const total = scenarios.reduce((sum, item) => sum + item.probability, 0);
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThan(1.01);
  });

  it("changes outputs when features change", () => {
    const base = computeScenarios(computeFeatures(fixture as EvidenceItem[]));
    const changed = computeScenarios([
      { name: "trip_delay_signal", value: 0.9, explanation: "test", confidence: 0.8 },
      { name: "vance_visibility_signal", value: 0.1, explanation: "test", confidence: 0.8 },
      { name: "iran_oil_signal", value: 0.1, explanation: "test", confidence: 0.8 },
      { name: "usd_dominance_signal", value: 0.1, explanation: "test", confidence: 0.8 },
      { name: "narrative_divergence_signal", value: 0.2, explanation: "test", confidence: 0.8 },
    ]);
    expect(base[0]?.probability).not.toBe(changed[0]?.probability);
  });

  it("narrative labels speculation explicitly", () => {
    const state = runGeopoliticalThesisScoring(fixture as EvidenceItem[]);
    const narrative = generateNarrative(state);
    expect(narrative.summary).toContain("FACT:");
    expect(narrative.summary).toContain("INFERENCE:");
    expect(narrative.summary).toContain("SPECULATION:");
  });
});
