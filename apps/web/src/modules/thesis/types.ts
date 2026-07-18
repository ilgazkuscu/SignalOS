export type FactualityLevel = "reported" | "inferred" | "speculative";
export type HypothesisStatus = "active" | "watch" | "weakened" | "invalidated";

export interface EvidenceItem {
  id: string;
  timestamp: number;
  source: string;
  headline: string;
  summary: string;
  factuality_level: FactualityLevel;
  confidence: number;
  entities: string[];
  supports_hypotheses: string[];
  weakens_hypotheses: string[];
}

export interface HypothesisNode {
  id: string;
  label: string;
  description: string;
  parent_id: string | null;
  prior: number;
  current_probability: number;
  confidence: number;
  status: HypothesisStatus;
}

export interface Feature {
  name: string;
  value: number;
  explanation: string;
  confidence: number;
}

export interface Scenario {
  id: string;
  label: string;
  probability: number;
  drivers: string[];
  invalidation_conditions: string[];
}

export interface MarketLink {
  market_id: string;
  relevance_score: number;
  rationale: string;
  scenario_dependency: string[];
}

export interface ThesisState {
  evidence: EvidenceItem[];
  features: Feature[];
  hypotheses: HypothesisNode[];
  scenarios: Scenario[];
  hypothesis_confidence: number;
  contradiction_penalty: number;
}

export interface TradeDecisionInput {
  market_id: string;
  market_label: string;
  market_yes_price: number;
  thesis_probability: number;
}

export interface TradeDecision {
  market_id: string;
  market_label: string;
  market_yes_price: number;
  thesis_probability: number;
  expected_value_yes: number;
  expected_value_no: number;
  edge: "long_yes" | "long_no" | "watch";
  confidence: number;
  position_size: "zero" | "small" | "medium" | "large";
  rationale: string;
}
