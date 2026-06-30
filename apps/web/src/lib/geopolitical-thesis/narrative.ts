import type { ThesisState } from "@/lib/geopolitical-thesis/types";

function strongestByDirection(state: ThesisState, direction: "support" | "oppose") {
  const filtered = state.evidence.filter((item) =>
    direction === "support" ? item.supports_hypotheses.length > 0 : item.weakens_hypotheses.length > 0,
  );
  return filtered.sort((left, right) => right.confidence - left.confidence)[0];
}

export function generateNarrative(state: ThesisState) {
  const topScenario = [...state.scenarios].sort((left, right) => right.probability - left.probability)[0];
  const topHypothesis = [...state.hypotheses]
    .filter((node) => node.id !== "H_ROOT")
    .sort((left, right) => right.current_probability - left.current_probability)[0];
  const support = strongestByDirection(state, "support");
  const oppose = strongestByDirection(state, "oppose");

  return {
    summary: `FACT: the highest-probability scenario is ${topScenario?.label ?? "undetermined"} at ${(topScenario?.probability ?? 0 * 100).toFixed(1)}%. INFERENCE: ${topHypothesis?.label ?? "No hypothesis"} is currently the strongest explanatory frame, but overall thesis confidence is ${(state.hypothesis_confidence * 100).toFixed(0)}% and contradiction pressure remains ${(state.contradiction_penalty * 100).toFixed(0)}%. SPECULATION: none of the active hypotheses should be treated as confirmed without stronger reported evidence.`,
    top_changes: [
      `Top scenario: ${topScenario?.label ?? "none"} (${((topScenario?.probability ?? 0) * 100).toFixed(1)}%).`,
      `Strongest hypothesis: ${topHypothesis?.label ?? "none"} (${((topHypothesis?.current_probability ?? 0) * 100).toFixed(1)}%).`,
    ],
    strongest_supporting_evidence: support
      ? [`FACT: ${support.headline} (${support.source}) supports ${support.supports_hypotheses.join(", ")}.`]
      : ["FACT: no strong supporting evidence is currently logged."],
    strongest_opposing_evidence: oppose
      ? [`FACT: ${oppose.headline} (${oppose.source}) weakens ${oppose.weakens_hypotheses.join(", ")}.`]
      : ["FACT: no strong opposing evidence is currently logged."],
    what_would_falsify: [
      "INFERENCE: repeated reported evidence showing routine scheduling, rather than crisis reprioritization, would weaken trip-based hypotheses.",
      "INFERENCE: disappearance of oil/SWIFT evidence would reduce leverage-oriented scenarios.",
      "SPECULATION: any theory of internal factional signaling should be downgraded if principal-level messaging becomes unified and stable.",
    ],
  };
}
