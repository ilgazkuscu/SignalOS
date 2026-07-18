import { BeliefEngine } from "@/modules/belief";
import type { MarketDefinition, MarketHistoryPoint, MarketSnapshot, Signal, WeightProfileKey } from "@/lib/types/domain";
import { compareIsoAsc } from "@/lib/utils/sort";
import type { BucketSnapshot, FamilyReplaySeries, MarketFamily, ReplayFrame } from "./types";

type MarketHistoryLikePoint = {
  timestamp: string;
  yesPrice: number;
};

export interface ComputeReplaySeriesOptions {
  from: Date;
  to: Date;
  interval: "hourly" | "daily" | "weekly";
  generatedAt?: string;
  signals: Signal[];
  marketHistoryByBucketId: Record<string, MarketHistoryLikePoint[]>;
  evaluateModelAt: (args: {
    family: MarketFamily;
    timestamp: Date;
    signalIdsInScope: string[];
  }) => Record<string, number | null>;
}

export interface ComputeEngineReplaySeriesOptions {
  from: Date;
  to: Date;
  interval: "hourly" | "daily" | "weekly";
  generatedAt?: string;
  profileKey?: WeightProfileKey;
  markets: MarketDefinition[];
  signals: Signal[];
  marketHistory: MarketHistoryPoint[];
}

const STEP_MS: Record<ComputeReplaySeriesOptions["interval"], number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function latestPointAtOrBefore(points: MarketHistoryLikePoint[], timestamp: number) {
  let latest: MarketHistoryLikePoint | null = null;
  for (const point of points) {
    if (new Date(point.timestamp).getTime() <= timestamp) latest = point;
    else break;
  }
  return latest;
}

function inferResolvedOutcome(points: MarketHistoryLikePoint[], resolvesAt: string) {
  const resolutionTs = new Date(resolvesAt).getTime();
  const latestAfter = points
    .filter((point) => new Date(point.timestamp).getTime() >= resolutionTs)
    .sort((left, right) => compareIsoAsc(left.timestamp, right.timestamp))
    .at(-1);
  const latestBefore = points
    .filter((point) => new Date(point.timestamp).getTime() <= resolutionTs)
    .sort((left, right) => compareIsoAsc(left.timestamp, right.timestamp))
    .at(-1);
  const latest = latestAfter ?? latestBefore;
  if (!latest) return null;
  if (latest.yesPrice >= 0.999) return "yes";
  if (latest.yesPrice <= 0.001) return "no";
  return null;
}

function weightedAggregate(rows: BucketSnapshot[], field: "modelProbability" | "marketPrice") {
  const eligible = rows.filter((row) => row.status === "active" && row[field] !== null);
  if (!eligible.length) return 0;
  const totalWeight = eligible.reduce((sum, row) => sum + row.weight, 0) || 1;
  return round(
    eligible.reduce((sum, row) => sum + (row[field] ?? 0) * row.weight, 0) / totalWeight,
  );
}

function buildFrameTimestamps(from: Date, to: Date, interval: ComputeReplaySeriesOptions["interval"]) {
  const frames: string[] = [];
  const step = STEP_MS[interval];
  let cursor = from.getTime();
  const end = to.getTime();

  while (cursor <= end) {
    frames.push(new Date(cursor).toISOString());
    cursor += step;
  }

  if (!frames.length || frames.at(-1) !== to.toISOString()) {
    frames.push(to.toISOString());
  }

  return Array.from(new Set(frames)).sort(compareIsoAsc);
}

export function computeReplaySeries(
  family: MarketFamily,
  opts: ComputeReplaySeriesOptions,
): FamilyReplaySeries {
  const orderedSignals = [...opts.signals].sort((left, right) => compareIsoAsc(left.occurredAt, right.occurredAt));
  const timestamps = buildFrameTimestamps(opts.from, opts.to, opts.interval);

  const frames = timestamps.map<ReplayFrame>((timestamp) => {
    const frameTs = new Date(timestamp).getTime();
    const signalsInScope = orderedSignals
      .filter((signal) => signal.status !== "rejected" && new Date(signal.occurredAt).getTime() <= frameTs)
      .map((signal) => signal.id);
    const modelByBucketId = opts.evaluateModelAt({
      family,
      timestamp: new Date(timestamp),
      signalIdsInScope: signalsInScope,
    });

    const bucketSnapshots = family.bucketOrder.map<BucketSnapshot>((bucket) => {
      const points = [...(opts.marketHistoryByBucketId[bucket.id] ?? [])].sort((left, right) =>
        compareIsoAsc(left.timestamp, right.timestamp),
      );
      const opensAt = bucket.opensAt ? new Date(bucket.opensAt).getTime() : Number.NEGATIVE_INFINITY;
      const resolvesAt = bucket.resolvesAt ?? bucket.opensAt ?? timestamp;
      const resolvesTs = new Date(resolvesAt).getTime();
      const closedTs = bucket.closedAt ? new Date(bucket.closedAt).getTime() : Number.POSITIVE_INFINITY;

      if (frameTs < opensAt) {
        return {
          bucketId: bucket.id,
          polymarketSlug: bucket.polymarketSlug ?? bucket.linkedMarketId ?? bucket.id,
          outcome: "YES by date",
          status: "not_yet_issued",
          modelProbability: null,
          marketPrice: null,
          weight: bucket.weight,
          resolvesAt,
          resolvedOutcome: null,
        };
      }

      if (frameTs >= resolvesTs || frameTs >= closedTs) {
        // Closed buckets carry settlement state forward but not live probabilities, so downstream code
        // cannot accidentally blend settled contracts into active-ladder aggregates.
        return {
          bucketId: bucket.id,
          polymarketSlug: bucket.polymarketSlug ?? bucket.linkedMarketId ?? bucket.id,
          outcome: "YES by date",
          status: "closed",
          modelProbability: null,
          marketPrice: null,
          weight: bucket.weight,
          resolvesAt,
          resolvedOutcome: bucket.resolvedOutcome ?? inferResolvedOutcome(points, bucket.closedAt ?? resolvesAt),
        };
      }

      return {
        bucketId: bucket.id,
        polymarketSlug: bucket.polymarketSlug ?? bucket.linkedMarketId ?? bucket.id,
        outcome: "YES by date",
        status: "active",
        modelProbability: modelByBucketId[bucket.id] ?? null,
        marketPrice: latestPointAtOrBefore(points, frameTs)?.yesPrice ?? null,
        weight: bucket.weight,
        resolvesAt,
        resolvedOutcome: null,
      };
    });

    const activeCount = bucketSnapshots.filter((bucket) => bucket.status === "active").length;
    const closedCount = bucketSnapshots.filter((bucket) => bucket.status === "closed").length;

    return {
      timestamp,
      bucketSnapshots,
      aggregateModelProbability: weightedAggregate(bucketSnapshots, "modelProbability"),
      aggregateMarketProbability: weightedAggregate(bucketSnapshots, "marketPrice"),
      activeCount,
      closedCount,
      signalsInScope,
      degenerate: activeCount === 0,
    };
  });

  return {
    familyId: family.id,
    horizon: { start: opts.from.toISOString(), end: opts.to.toISOString() },
    frames,
    frameInterval: opts.interval,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
  };
}

function buildMarketSnapshotsForTimestamp(
  markets: ComputeEngineReplaySeriesOptions["markets"],
  marketHistory: MarketHistoryPoint[],
  now: Date,
) {
  return markets.map<MarketSnapshot>((market) => {
    const latestPoint = marketHistory
      .filter((point) => point.marketId === market.id && new Date(point.timestamp) <= now)
      .sort((left, right) => compareIsoAsc(left.timestamp, right.timestamp))
      .at(-1);

    return latestPoint
      ? {
          marketId: market.id,
          timestamp: latestPoint.timestamp,
          yesPrice: latestPoint.yesPrice,
          noPrice: latestPoint.noPrice,
          volume: latestPoint.volume ?? 0,
          volatility: latestPoint.spread ?? 0,
        }
      : {
          marketId: market.id,
          timestamp: now.toISOString(),
          yesPrice: 0.5,
          noPrice: 0.5,
          volume: 0,
          volatility: 0,
        };
  });
}

export function computeEngineReplaySeries(
  family: MarketFamily,
  opts: ComputeEngineReplaySeriesOptions,
): FamilyReplaySeries {
  const profileKey = opts.profileKey ?? "balanced";
  const signalMap = new Map(opts.signals.map((signal) => [signal.id, signal]));
  const marketHistoryByBucketId = Object.fromEntries(
    family.bucketOrder.map((bucket) => [
      bucket.id,
      opts.marketHistory
        .filter((point) => point.marketId === bucket.linkedMarketId)
        .map((point) => ({ timestamp: point.timestamp, yesPrice: point.yesPrice })),
    ]),
  ) as Record<string, MarketHistoryLikePoint[]>;

  return computeReplaySeries(family, {
    from: opts.from,
    to: opts.to,
    interval: opts.interval,
    generatedAt: opts.generatedAt,
    signals: opts.signals,
    marketHistoryByBucketId,
    evaluateModelAt: ({ timestamp, signalIdsInScope }) => {
      const signals = signalIdsInScope
        .map((signalId) => signalMap.get(signalId))
        .filter((signal): signal is Signal => Boolean(signal));
      const marketSnapshots = buildMarketSnapshotsForTimestamp(opts.markets, opts.marketHistory, timestamp);
      const belief = new BeliefEngine({
        markets: opts.markets,
        signals,
        marketSnapshots,
      }).recomputeBelief({ now: timestamp, profileKey });

      return Object.fromEntries(
        family.bucketOrder.map((bucket) => [bucket.id, belief.yesProbabilityByContract[bucket.linkedMarketId as keyof typeof belief.yesProbabilityByContract] ?? null]),
      );
    },
  });
}
