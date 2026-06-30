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

export interface FixtureBundle {
  markets: MarketDefinition[];
  sources: SourceMeta[];
  sourceEvents: SourceEvent[];
  signals: Signal[];
  marketSnapshots: MarketSnapshot[];
  marketHistory: MarketHistoryPoint[];
  scenarios: ScenarioDefinition[];
  weightProfiles: WeightProfile[];
}
