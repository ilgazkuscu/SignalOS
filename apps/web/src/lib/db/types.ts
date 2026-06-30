import type {
  MarketHistoryPoint,
  MarketDefinition,
  MarketSnapshot,
  ScenarioDefinition,
  Signal,
  SourceEvent,
  SourceMeta,
  WeightProfile,
} from "@/lib/types/domain";

export interface DataRepository {
  getMarkets(): Promise<MarketDefinition[]>;
  getSources(): Promise<SourceMeta[]>;
  getSourceEvents(): Promise<SourceEvent[]>;
  getSignals(): Promise<Signal[]>;
  getMarketSnapshots(): Promise<MarketSnapshot[]>;
  getMarketHistory(): Promise<MarketHistoryPoint[]>;
  getScenarios(): Promise<ScenarioDefinition[]>;
  getWeightProfiles(): Promise<WeightProfile[]>;
}
