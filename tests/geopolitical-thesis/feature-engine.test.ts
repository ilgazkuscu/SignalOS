import { describe, expect, it } from "vitest";
import { computeFeatures } from "@/lib/geopolitical-thesis/feature-engine";
import fixture from "../../fixtures/geopolitical-thesis/sample-news.json";
import type { EvidenceItem } from "@/lib/geopolitical-thesis/types";

describe("feature engine", () => {
  it("keeps all features bounded", () => {
    const features = computeFeatures(fixture as EvidenceItem[]);
    expect(features).toHaveLength(5);
    for (const feature of features) {
      expect(feature.value).toBeGreaterThanOrEqual(0);
      expect(feature.value).toBeLessThanOrEqual(1);
      expect(feature.confidence).toBeGreaterThanOrEqual(0);
      expect(feature.confidence).toBeLessThanOrEqual(1);
      expect(Number.isNaN(feature.value)).toBe(false);
    }
  });
});
