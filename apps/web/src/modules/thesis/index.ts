export { addEvidence, deduplicateEvidence, scoreEvidence } from "./evidence-ledger";
export { computeFeatures } from "./feature-engine";
export { buildHypothesisTree } from "./hypothesis-tree";
export { linkMarkets } from "./market-linker";
export { generateNarrative } from "./narrative";
export { computeScenarios } from "./scenario-engine";
export { runGeopoliticalThesisScoring } from "./scoring";
export { buildTradeDecisionLayer } from "./trade-decision-layer";
export type {
  EvidenceItem,
  FactualityLevel,
  Feature,
  HypothesisNode,
  HypothesisStatus,
  MarketLink,
  Scenario,
  ThesisState,
  TradeDecision,
  TradeDecisionInput,
} from "./types";
