import { describe, expect, it } from "vitest";
import { classifyStatement } from "@/lib/classifiers/statement-classifier";

describe("statement classifier", () => {
  it("treats ceasefire language as ambiguous without explicit end wording", () => {
    const result = classifyStatement({
      text: "A ceasefire is in place while forces remain ready.",
      sourceType: "official",
      officialness: 0.96,
      mediaFormat: "text",
    });

    expect(result.label).toBe("qualifies_yes_ambiguous");
    expect(result.qualifiesYesProbability).toBeLessThan(0.75);
  });

  it("treats explicit operations concluded language as high qualifying probability", () => {
    const result = classifyStatement({
      text: "U.S. military operations against Iran have concluded effective immediately.",
      sourceType: "official",
      officialness: 0.98,
      mediaFormat: "text",
    });

    expect(result.label).toBe("qualifies_yes_high");
    expect(result.qualifiesYesProbability).toBeGreaterThan(0.75);
  });

  it("penalizes unnamed source leak language", () => {
    const result = classifyStatement({
      text: "Unnamed officials said operations may be over.",
      sourceType: "news",
      officialness: 0.35,
      mediaFormat: "text",
    });

    expect(result.qualifiesYesProbability).toBeLessThan(0.4);
  });

  it("allows Truth Social to count if wording is explicit", () => {
    const result = classifyStatement({
      text: "We are no longer conducting military operations against Iran.",
      sourceType: "social",
      officialness: 0.91,
      mediaFormat: "text",
    });

    expect(result.label).toBe("qualifies_yes_high");
  });

  it("treats official pause wording as de-escalatory but still ambiguous", () => {
    const result = classifyStatement({
      text: "Offensive operations remain paused while diplomacy proceeds.",
      sourceType: "official",
      officialness: 0.98,
      mediaFormat: "text",
    });

    expect(result.label).toBe("qualifies_yes_ambiguous");
    expect(result.ambiguityFlags.length).toBeGreaterThan(0);
  });

  it("classifies explicit end language from leak-style sourcing as non-qualifying", () => {
    const result = classifyStatement({
      text: "According to leaks, unnamed officials say military operations against Iran have concluded.",
      sourceType: "news",
      officialness: 0.28,
      mediaFormat: "text",
    });

    expect(result.qualifiesYesProbability).toBeLessThan(0.6);
    expect(result.ambiguityFlags).toContain("Source framing appears unofficial or leak-based.");
  });

  it("lets escalatory language override ambiguous de-escalation framing", () => {
    const result = classifyStatement({
      text: "A ceasefire is in place but all options remain on the table and further action may follow.",
      sourceType: "official",
      officialness: 0.95,
      mediaFormat: "text",
    });

    expect(result.label).toBe("escalatory");
  });

  it("rewards explicit video statements on a qualifying social channel", () => {
    const result = classifyStatement({
      text: "Our military operations against Iran have ended effective immediately.",
      sourceType: "social",
      officialness: 0.92,
      mediaFormat: "video",
    });

    expect(result.label).toBe("qualifies_yes_high");
    expect(result.qualifiesYesProbability).toBeGreaterThan(0.8);
  });
});
