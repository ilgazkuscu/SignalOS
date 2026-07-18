import type { HypothesisNode } from "./types";

export function buildHypothesisTree(): HypothesisNode[] {
  return [
    {
      id: "H_ROOT",
      label: "Strategic Thesis Stack",
      description: "Top-level container for competing geopolitical explanations.",
      parent_id: null,
      prior: 1,
      current_probability: 1,
      confidence: 1,
      status: "active",
    },
    {
      id: "H1",
      label: "China Trip Timing",
      description: "Travel timing or delay reflects crisis reprioritization rather than routine scheduling noise.",
      parent_id: "H_ROOT",
      prior: 0.28,
      current_probability: 0.28,
      confidence: 0.5,
      status: "watch",
    },
    {
      id: "H2",
      label: "Iran Oil Leverage",
      description: "Iran-linked oil flows and Hormuz risk are being used as bargaining leverage in a broader energy negotiation.",
      parent_id: "H_ROOT",
      prior: 0.26,
      current_probability: 0.26,
      confidence: 0.5,
      status: "watch",
    },
    {
      id: "H3",
      label: "USD/SWIFT Preservation",
      description: "Policy moves are partially driven by preserving dollar-clearing dominance and limiting sanctions-evasion channels.",
      parent_id: "H_ROOT",
      prior: 0.22,
      current_probability: 0.22,
      confidence: 0.46,
      status: "watch",
    },
    {
      id: "H4",
      label: "Vance Elevation",
      description: "Vice-presidential visibility is being increased to shape factional signaling, succession optics, or negotiation framing.",
      parent_id: "H_ROOT",
      prior: 0.24,
      current_probability: 0.24,
      confidence: 0.44,
      status: "watch",
    },
  ];
}
