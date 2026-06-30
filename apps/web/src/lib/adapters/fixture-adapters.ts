import { demoFixtures } from "@/lib/fixtures/demo";
import type { Signal, SourceEvent } from "@/lib/types/domain";
import { FixtureAdapter, type AdapterResult } from "@/lib/adapters/base";

function filterBySource(sourceId: string): AdapterResult {
  return {
    sourceEvents: demoFixtures.sourceEvents.filter((event) => event.sourceId === sourceId),
    signals: demoFixtures.signals.filter((signal) => signal.sourceId === sourceId),
  };
}

class SimpleFixtureAdapter extends FixtureAdapter {
  constructor(
    public key: string,
    private readonly sourceId: string,
  ) {
    super();
  }

  protected records: unknown[] = [];

  async normalize(): Promise<AdapterResult> {
    return filterBySource(this.sourceId);
  }
}

export const truthSocialAdapter = new SimpleFixtureAdapter("truth_social_adapter", "truthsocial");
export const whiteHouseStatementsAdapter = new SimpleFixtureAdapter("white_house_statements_adapter", "whitehouse");
export const dodStatementsAdapter = new SimpleFixtureAdapter("dod_statements_adapter", "dod");
export const flightsAdapter = new SimpleFixtureAdapter("flights_adapter", "flights");
export const diplomaticEventsAdapter = new SimpleFixtureAdapter("diplomatic_events_adapter", "diplomacy");
export const pizzaIndexAdapter = new SimpleFixtureAdapter("pizza_index_adapter", "pizza");
export const marketAdapter = new SimpleFixtureAdapter("market_adapter", "market");

export const manualSignalAdapter = {
  key: "manual_signal_adapter",
  async fetchRecords(): Promise<unknown[]> {
    return [];
  },
  async normalize(records: unknown[]): Promise<{ sourceEvents: SourceEvent[]; signals: Signal[] }> {
    return {
      sourceEvents: records as SourceEvent[],
      signals: [],
    };
  },
  async run(): Promise<{ sourceEvents: SourceEvent[]; signals: Signal[] }> {
    return {
      sourceEvents: [],
      signals: [],
    };
  },
};

export const overflightNormalizationAdapter = {
  key: "overflight_normalization_adapter",
  async fetchRecords(): Promise<unknown[]> {
    return [];
  },
  async normalize(): Promise<AdapterResult> {
    return {
      sourceEvents: [],
      signals: [],
    };
  },
  async run(): Promise<AdapterResult> {
    return this.normalize();
  },
};

export const allAdapters = [
  truthSocialAdapter,
  whiteHouseStatementsAdapter,
  dodStatementsAdapter,
  flightsAdapter,
  diplomaticEventsAdapter,
  pizzaIndexAdapter,
  marketAdapter,
  manualSignalAdapter,
  overflightNormalizationAdapter,
];
