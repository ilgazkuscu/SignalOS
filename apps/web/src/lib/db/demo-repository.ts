import { demoFixtures } from "@/lib/fixtures/demo";
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
import type { DataRepository } from "@/lib/db/types";

export class DemoRepository implements DataRepository {
  async getMarkets(): Promise<MarketDefinition[]> {
    return demoFixtures.markets;
  }

  async getSources(): Promise<SourceMeta[]> {
    return demoFixtures.sources;
  }

  async getSourceEvents(): Promise<SourceEvent[]> {
    return demoFixtures.sourceEvents;
  }

  async getSignals(): Promise<Signal[]> {
    return demoFixtures.signals;
  }

  async getMarketSnapshots(): Promise<MarketSnapshot[]> {
    return demoFixtures.marketSnapshots;
  }

  async getMarketHistory(): Promise<MarketHistoryPoint[]> {
    return demoFixtures.marketHistory;
  }

  async getScenarios(): Promise<ScenarioDefinition[]> {
    return demoFixtures.scenarios;
  }

  async getWeightProfiles(): Promise<WeightProfile[]> {
    return demoFixtures.weightProfiles;
  }
}

export const demoRepository = new DemoRepository();
