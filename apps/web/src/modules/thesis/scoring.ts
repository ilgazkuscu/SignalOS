import { deduplicateEvidence, scoreEvidence } from "./evidence-ledger";
import { computeFeatures } from "./feature-engine";
import { buildHypothesisTree } from "./hypothesis-tree";
import { computeScenarios } from "./scenario-engine";
import type { EvidenceItem, HypothesisNode, ThesisState } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function featureValue(state: ThesisState["features"], name: string) {
  return state.find((feature) => feature.name === name)?.value ?? 0;
}

function contradictionPenalty(evidence: EvidenceItem[]) {
  const supporting = evidence.filter((item) => item.supports_hypotheses.length > 0).length;
  const weakening = evidence.filter((item) => item.weakens_hypotheses.length > 0).length;
  if (supporting === 0 || weakening === 0) return 0;
  return clamp01(Math.min(supporting, weakening) / Math.max(supporting, weakening) * 0.35);
}

function scoreHypotheses(
  base: HypothesisNode[],
  evidence: EvidenceItem[],
  features: ThesisState["features"],
  penalty: number,
): HypothesisNode[] {
  const trip = featureValue(features, "trip_delay_signal");
  const vance = featureValue(features, "vance_visibility_signal");
  const oil = featureValue(features, "iran_oil_signal");
  const usd = featureValue(features, "usd_dominance_signal");
  const divergence = featureValue(features, "narrative_divergence_signal");

  const hypothesisSignal: Record<string, number> = {
    H1: trip * 0.65 - divergence * 0.18,
    H2: oil * 0.62 + trip * 0.08 - divergence * 0.12,
    H3: usd * 0.68 + oil * 0.12 - divergence * 0.08,
    H4: vance * 0.7 + trip * 0.06 - divergence * 0.14,
    H_ROOT: 1,
  };

  return base.map((node) => {
    if (node.id === "H_ROOT") return node;
    const support = evidence
      .filter((item) => item.supports_hypotheses.includes(node.id))
      .reduce((sum, item) => sum + item.confidence, 0);
    const weaken = evidence
      .filter((item) => item.weakens_hypotheses.includes(node.id))
      .reduce((sum, item) => sum + item.confidence, 0);
    const net = hypothesisSignal[node.id] + support * 0.22 - weaken * 0.24 - penalty;
    const probability = clamp01(node.prior * 0.55 + net);
    const confidence = clamp01((support + weaken + 0.25) / 2.5 - penalty * 0.4);
    return {
      ...node,
      current_probability: Number(probability.toFixed(4)),
      confidence: Number(confidence.toFixed(4)),
      status:
        probability >= 0.65 ? "active" :
        probability >= 0.45 ? "watch" :
        weaken > support ? "weakened" : "watch",
    };
  });
}

export function runGeopoliticalThesisScoring(evidenceList: EvidenceItem[], now = Date.now()): ThesisState {
  const scored = deduplicateEvidence(evidenceList.map((item) => scoreEvidence(item, now)));
  const features = computeFeatures(scored);
  const penalty = contradictionPenalty(scored);
  const hypotheses = scoreHypotheses(buildHypothesisTree(), scored, features, penalty);
  const scenarios = computeScenarios(features);
  const hypothesisConfidence = clamp01(
    hypotheses
      .filter((node) => node.id !== "H_ROOT")
      .reduce((sum, node) => sum + node.confidence, 0) /
      Math.max(hypotheses.length - 1, 1) -
      penalty * 0.45,
  );

  return {
    evidence: scored,
    features,
    hypotheses,
    scenarios,
    hypothesis_confidence: Number(hypothesisConfidence.toFixed(4)),
    contradiction_penalty: Number(penalty.toFixed(4)),
  };
}
