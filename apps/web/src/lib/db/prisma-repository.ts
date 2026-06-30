import type { DataRepository } from "@/lib/db/types";
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

export class PrismaRepository implements DataRepository {
  async getMarkets(): Promise<MarketDefinition[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getSources(): Promise<SourceMeta[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getSourceEvents(): Promise<SourceEvent[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getSignals(): Promise<Signal[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getMarketSnapshots(): Promise<MarketSnapshot[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getMarketHistory(): Promise<MarketHistoryPoint[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getScenarios(): Promise<ScenarioDefinition[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }

  async getWeightProfiles(): Promise<WeightProfile[]> {
    throw new Error("PrismaRepository is not implemented yet. Use fixture mode for local development.");
  }
}

export const prismaRepository = new PrismaRepository();
