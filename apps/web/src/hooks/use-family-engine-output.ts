"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketFamily, FamilyBucketRow, FamilyEngineOutput, FamilyNewsRow, FamilyReplayRow, FamilySignalRow, FamilySummary } from "@/engine/family";
import { registeredFamilies } from "@/engine/families";
import { computeEngineReplaySeries, computeReplaySeries } from "@/engine/replay-series";
import { deriveHormuzModelByDate } from "@/lib/hormuz";
import { sourceEventUrl } from "@/lib/intelligence/source-url";
import type { DashboardPayload, ReplayPayload, SignalsExplorerPayload, TimelinePayload } from "@/lib/types/domain";
import type { EventMarketHistoryPoint, PolymarketEventMarket } from "@/lib/polymarket/fetcher";

interface SnapshotPayload {
  hormuzMarkets: PolymarketEventMarket[];
  liveHormuzHistoryByLabel: Record<string, EventMarketHistoryPoint[]>;
}

interface WorkspaceModel2Payload {
  model: {
    hmm: {
      feature_columns: string[];
    };
  };
  phase: any;
}

interface WorkspacePayload {
  dashboard: DashboardPayload;
  replay?: ReplayPayload;
  signals: SignalsExplorerPayload;
  timeline: TimelinePayload;
  model2?: WorkspaceModel2Payload | null;
  snapshots?: SnapshotPayload;
}

interface FamilyOutputOptions {
  includeReplay?: boolean;
  replayInterval?: "hourly" | "daily" | "weekly";
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function isClosedBucket(bucket: Pick<FamilyBucketRow, "deadlineAt" | "closedAt" | "marketStatus">, generatedAt: string) {
  if (bucket.marketStatus === "closed") return true;
  if (bucket.closedAt && new Date(bucket.closedAt).getTime() <= new Date(generatedAt).getTime()) return true;
  if (!bucket.deadlineAt) return false;
  return new Date(bucket.deadlineAt).getTime() < new Date(generatedAt).getTime();
}

function buildHorizonLabel(activeBuckets: FamilyBucketRow[], allBuckets: FamilyBucketRow[]) {
  const source = activeBuckets.length ? activeBuckets : allBuckets;
  if (!source.length) return "No active ladder";
  if (source.length === 1) return `${source[0].label} ladder`;
  return `${source[0].label} to ${source[source.length - 1].label} ladder`;
}

function signForDirection(direction: string) {
  if (direction === "pro_yes") return 1;
  if (direction === "pro_no") return -1;
  return 0;
}

function latestReplayAtOrBefore<T extends { asOf: string }>(rows: T[], targetTs: number) {
  let latest: T | null = null;

  for (const row of rows) {
    if (new Date(row.asOf).getTime() <= targetTs) latest = row;
    else break;
  }

  return latest;
}

function buildSignalRows(
  family: MarketFamily,
  payload: WorkspacePayload,
  weightOverrides: Record<string, number>,
) {
  const eventUrlById = new Map(payload.timeline.events.map((event) => [event.id, sourceEventUrl(event)]));
  const relevantSignals = payload.signals.signals
    .filter((signal) => family.relevantSignalTypes.includes(signal.family))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  return relevantSignals.map<FamilySignalRow>((signal) => {
    const defaultWeight = family.signalWeights[signal.family] ?? 1;
    const activeWeight = weightOverrides[signal.family] ?? defaultWeight;
    const adjustedImpact = signForDirection(signal.direction) * signal.magnitude * signal.confidence * activeWeight;

    return {
      id: signal.id,
      signalType: signal.family,
      title: signal.subtype.replaceAll("_", " "),
      source: signal.sourceId,
      sourceUrl: eventUrlById.get(signal.sourceEventId),
      timestamp: signal.occurredAt,
      impactDirection:
        signal.direction === "pro_yes" ? "positive" : signal.direction === "pro_no" ? "negative" : "neutral",
      magnitude: signal.magnitude,
      confidence: signal.confidence,
      weight: activeWeight,
      defaultWeight,
      adjustedImpact,
      rationale: signal.rationale,
    };
  });
}

function applySignalAdjustments(
  family: MarketFamily,
  buckets: FamilyBucketRow[],
  signals: FamilySignalRow[],
) {
  const adjusted = new Map(buckets.map((bucket) => [bucket.id, bucket.modelProbability]));

  for (const signal of signals) {
    const influences = family.signalBucketInfluence[signal.signalType] ?? {};
    for (const bucket of buckets) {
      const influence = influences[bucket.id] ?? 0;
      if (!influence) continue;
      const current = adjusted.get(bucket.id) ?? bucket.modelProbability;
      const delta = signal.adjustedImpact * influence * 0.06;
      adjusted.set(bucket.id, clamp(current + delta));
    }
  }

  let monotonicFloor = 0;
  return buckets.map((bucket) => {
    monotonicFloor = Math.max(monotonicFloor, adjusted.get(bucket.id) ?? bucket.modelProbability);
    const modelProbability = round(monotonicFloor);
    return {
      ...bucket,
      modelProbability,
      gap: round(modelProbability - bucket.marketProbability),
    };
  });
}

function scoreNewsItem(text: string, family: MarketFamily) {
  const haystack = text.toLowerCase();
  let score = 0;

  for (const keyword of family.news.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 0.12;
  }
  for (const entity of family.news.entities) {
    if (haystack.includes(entity.toLowerCase())) score += 0.16;
  }

  return clamp(score);
}

function buildNewsRows(family: MarketFamily, payload: WorkspacePayload): FamilyNewsRow[] {
  const signalBySourceEventId = new Map(payload.signals.signals.map((signal) => [signal.sourceEventId, signal]));
  const generatedAt = new Date(
    payload.timeline.generatedAt ?? payload.dashboard.generatedAt,
  ).getTime();
  const sevenDaysAgo = generatedAt - 7 * 24 * 60 * 60 * 1000;

  const rows: FamilyNewsRow[] = [];

  for (const event of payload.timeline.events) {
      const eventTs = new Date(event.occurredAt).getTime();
      if (eventTs < sevenDaysAgo || eventTs > generatedAt) continue;
      const text = `${event.title} ${event.body} ${event.tags.join(" ")}`;
      const relevanceScore = scoreNewsItem(text, family);

      const linkedSignal = signalBySourceEventId.get(event.id);

      rows.push({
        id: event.id,
        headline: event.title,
        source: event.sourceId,
        timestamp: event.occurredAt,
        relevanceScore,
        url: sourceEventUrl(event),
        processedSignalId: linkedSignal?.id,
        status: linkedSignal ? "processed" : "pending",
      });
  }

  return rows.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

function weightedProbability(rows: Array<{ weight: number; modelProbability: number; marketProbability: number }>) {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const aggregateModelProbability = rows.reduce((sum, row) => sum + row.modelProbability * row.weight, 0) / totalWeight;
  const aggregateMarketProbability = rows.reduce((sum, row) => sum + row.marketProbability * row.weight, 0) / totalWeight;

  return {
    aggregateModelProbability: round(aggregateModelProbability),
    aggregateMarketProbability: round(aggregateMarketProbability),
  };
}

function buildIranOutput(
  family: MarketFamily,
  payload: WorkspacePayload,
  weightOverrides: Record<string, number>,
  options: FamilyOutputOptions = {},
): FamilyEngineOutput {
  const allBuckets = family.bucketOrder.map<FamilyBucketRow>((bucket) => {
    const modelProbability = payload.dashboard.discrepancy.find((entry) => entry.marketId === bucket.id)?.modelYes ?? 0;
    const marketProbability = payload.dashboard.marketSnapshots.find((entry) => entry.marketId === bucket.id)?.yesPrice ?? 0;
    const market = payload.dashboard.markets.find((entry) => entry.id === bucket.id);
    const deadlineAt = market?.deadlineAt ?? bucket.resolvesAt;
    const closedAt = market?.closedAt ?? bucket.closedAt;

    return {
      id: bucket.id,
      label: bucket.label,
      role: bucket.role,
      slug: market?.slug,
      deadlineAt,
      closedAt,
      marketStatus:
        market?.marketStatus ??
        (closedAt && new Date(closedAt).getTime() <= new Date(payload.dashboard.generatedAt).getTime() ? "closed" : "open"),
      resolvedOutcome: market?.resolvedOutcome ?? bucket.resolvedOutcome ?? null,
      outcome: "YES by date",
      weight: bucket.weight,
      modelProbability: round(modelProbability),
      marketProbability: round(marketProbability),
      gap: round(modelProbability - marketProbability),
    };
  });
  const signals = buildSignalRows(family, payload, weightOverrides);
  const adjustedAllBuckets = applySignalAdjustments(family, allBuckets, signals);
  const closedBuckets = adjustedAllBuckets.filter((bucket) => isClosedBucket(bucket, payload.dashboard.generatedAt));
  const adjustedBuckets = adjustedAllBuckets.filter((bucket) => !isClosedBucket(bucket, payload.dashboard.generatedAt));
  const primaryBucket =
    adjustedBuckets.find((bucket) => bucket.id === family.primaryReplayBucketId) ??
    adjustedBuckets[0] ??
    adjustedAllBuckets.find((bucket) => bucket.id === family.primaryReplayBucketId) ??
    adjustedAllBuckets[0];
  const replay = (payload.replay?.history ?? []).map<FamilyReplayRow>((entry) => {
    const modelProbability = entry.belief.yesProbabilityByContract[family.primaryReplayBucketId as keyof typeof entry.belief.yesProbabilityByContract] ?? 0;
    const marketProbability = (entry.marketByContract[family.primaryReplayBucketId as keyof typeof entry.marketByContract] ?? 0) as number;
    return {
      asOf: entry.asOf,
      label: entry.asOf,
      modelProbability: round(modelProbability),
      marketProbability: round(marketProbability),
      gap: round(modelProbability - marketProbability),
    };
  });
  const news = buildNewsRows(family, payload);
  const aggregateSource = adjustedBuckets.length ? adjustedBuckets : adjustedAllBuckets;
  const { aggregateModelProbability, aggregateMarketProbability } = weightedProbability(aggregateSource);

  return {
    familyId: family.id,
    displayName: family.displayName,
    shortThesis: family.shortThesis,
    description: family.description,
    generatedAt: payload.dashboard.generatedAt,
    aggregateModelProbability,
    aggregateMarketProbability,
    gap: round(aggregateModelProbability - aggregateMarketProbability),
    horizonLabel: buildHorizonLabel(adjustedBuckets, adjustedAllBuckets),
    primaryBucketLabel: primaryBucket?.label ?? family.bucketOrder[0]?.label ?? "Focus bucket",
    primaryBucketModelProbability: primaryBucket?.modelProbability ?? 0,
    primaryBucketMarketProbability: primaryBucket?.marketProbability ?? 0,
    primaryBucketGap: primaryBucket?.gap ?? 0,
    buckets: adjustedBuckets,
    closedBuckets,
    replay,
    replaySeries: options.includeReplay
      ? computeEngineReplaySeries(family, {
          from: new Date(payload.replay?.history[0]?.asOf ?? payload.dashboard.generatedAt),
          to: new Date(payload.dashboard.generatedAt),
          interval: options.replayInterval ?? "daily",
          generatedAt: payload.dashboard.generatedAt,
          profileKey: "balanced",
          markets: payload.dashboard.markets,
          signals: payload.signals.signals,
          marketHistory: payload.dashboard.marketHistory,
        })
      : undefined,
    signals,
    signalTimeline: signals,
    signalMatrix: family.relevantSignalTypes.map((signalType) => ({
      signalType,
      bucketImpacts: family.bucketOrder.map((bucket) => ({
        bucketId: bucket.id,
        value: round((family.signalBucketInfluence[signalType]?.[bucket.id] ?? 0) * 100, 0),
      })),
    })),
    news,
    playbook: family.playbook,
    emptyStates: {
      news: news.length ? undefined : "News ingest not configured for this family.",
      playbook: family.playbook ? undefined : "No playbook written yet for this family.",
      replay: replay.length ? undefined : "No replay history available for this family yet.",
      signals: signals.length ? undefined : "No signals matched this family yet.",
    },
  };
}

function buildHormuzReplay(
  payload: WorkspacePayload,
  bucketId: string,
): FamilyReplayRow[] {
  const marketHistory = payload.snapshots?.liveHormuzHistoryByLabel[bucketId] ?? [];
  const modelRows = (payload.replay?.history ?? [])
    .map((entry) => ({
      asOf: entry.asOf,
      modelByLabel: deriveHormuzModelByDate(entry.belief.yesProbabilityByContract as Record<string, number>),
    }))
    .sort((left, right) => new Date(left.asOf).getTime() - new Date(right.asOf).getTime());

  return marketHistory.map((point) => {
    const row = latestReplayAtOrBefore(modelRows, new Date(point.timestamp).getTime());
    const modelProbability = row?.modelByLabel[bucketId] ?? 0;
    const marketProbability = point.yesPrice;
    return {
      asOf: point.timestamp,
      label: point.timestamp,
      modelProbability: round(modelProbability),
      marketProbability: round(marketProbability),
      gap: round(modelProbability - marketProbability),
    };
  });
}

function buildHormuzOutput(
  family: MarketFamily,
  payload: WorkspacePayload,
  weightOverrides: Record<string, number>,
  options: FamilyOutputOptions = {},
): FamilyEngineOutput {
  const baselineModelByDate = deriveHormuzModelByDate(
    Object.fromEntries(payload.dashboard.discrepancy.map((entry) => [entry.marketId, entry.modelYes])),
  );
  const generatedAt = payload.dashboard.generatedAt;
  const replayHistory = payload.replay?.history ?? [];
  const hormuzHistoryByLabel = payload.snapshots?.liveHormuzHistoryByLabel ?? {};
  const hormuzMarkets = payload.snapshots?.hormuzMarkets ?? [];
  const allBuckets = family.bucketOrder.map<FamilyBucketRow>((bucket) => {
    const market = hormuzMarkets.find((entry) => entry.label === bucket.id);
    const marketProbability = market?.yesPrice ?? 0;
    const modelProbability = baselineModelByDate[bucket.id] ?? 0;
    const deadlineAt = bucket.resolvesAt;
    const closedAt = market?.closedTime ?? bucket.closedAt;
    return {
      id: bucket.id,
      label: bucket.label,
      role: bucket.role,
      slug: market?.slug,
      deadlineAt,
      closedAt,
      marketStatus:
        market?.closed || (closedAt && new Date(closedAt).getTime() <= new Date(generatedAt).getTime())
          ? "closed"
          : "open",
      resolvedOutcome: market?.resolvedOutcome ?? bucket.resolvedOutcome ?? null,
      outcome: "YES by date",
      weight: bucket.weight,
      modelProbability: round(modelProbability),
      marketProbability: round(marketProbability),
      gap: round(modelProbability - marketProbability),
    };
  });
  const signals = buildSignalRows(family, payload, weightOverrides);
  const adjustedAllBuckets = applySignalAdjustments(family, allBuckets, signals);
  const closedBuckets = adjustedAllBuckets.filter((bucket) => isClosedBucket(bucket, generatedAt));
  const adjustedBuckets = adjustedAllBuckets.filter((bucket) => !isClosedBucket(bucket, generatedAt));
  const primaryBucket =
    adjustedBuckets.find((bucket) => bucket.id === family.primaryReplayBucketId) ??
    adjustedBuckets[0] ??
    adjustedAllBuckets.find((bucket) => bucket.id === family.primaryReplayBucketId) ??
    adjustedAllBuckets[0];
  const replay = payload.snapshots ? buildHormuzReplay(payload, family.primaryReplayBucketId) : [];
  const news = buildNewsRows(family, payload);
  const aggregateSource = adjustedBuckets.length ? adjustedBuckets : adjustedAllBuckets;
  const { aggregateModelProbability, aggregateMarketProbability } = weightedProbability(aggregateSource);
  const signalMap = new Map(payload.signals.signals.map((signal) => [signal.id, signal]));
  const earliestReplayTimestamp = family.bucketOrder
    .flatMap((bucket) => hormuzHistoryByLabel[bucket.id] ?? [])
    .map((point) => point.timestamp)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];

  return {
    familyId: family.id,
    displayName: family.displayName,
    shortThesis: family.shortThesis,
    description: family.description,
    generatedAt: payload.dashboard.generatedAt,
    aggregateModelProbability,
    aggregateMarketProbability,
    gap: round(aggregateModelProbability - aggregateMarketProbability),
    horizonLabel: buildHorizonLabel(adjustedBuckets, adjustedAllBuckets),
    primaryBucketLabel: primaryBucket?.label ?? family.bucketOrder[0]?.label ?? "Focus bucket",
    primaryBucketModelProbability: primaryBucket?.modelProbability ?? 0,
    primaryBucketMarketProbability: primaryBucket?.marketProbability ?? 0,
    primaryBucketGap: primaryBucket?.gap ?? 0,
    buckets: adjustedBuckets,
    closedBuckets,
    replay,
    replaySeries: options.includeReplay
      ? computeReplaySeries(family, {
          from: new Date(earliestReplayTimestamp ?? replay[0]?.asOf ?? generatedAt),
          to: new Date(generatedAt),
          interval: options.replayInterval ?? "daily",
          generatedAt,
          signals: payload.signals.signals,
          marketHistoryByBucketId: Object.fromEntries(
            family.bucketOrder.map((bucket) => [
              bucket.id,
              (hormuzHistoryByLabel[bucket.id] ?? []).map((point) => ({
                timestamp: point.timestamp,
                yesPrice: point.yesPrice,
              })),
            ]),
          ),
          evaluateModelAt: ({ timestamp, signalIdsInScope }) => {
            const signals = signalIdsInScope
              .map((signalId) => signalMap.get(signalId))
              .filter((signal): signal is NonNullable<typeof signal> => Boolean(signal));
            const baselineModelByDate = deriveHormuzModelByDate(
              Object.fromEntries(
                payload.dashboard.markets.map((market) => {
                  const replayHistory = payload.replay?.history;
                  const marketHistoryEntry = replayHistory
                    ? replayHistory
                        .filter((entry) => new Date(entry.asOf).getTime() <= timestamp.getTime())
                        .at(-1)
                    : undefined;
                  return [market.id, marketHistoryEntry?.belief.yesProbabilityByContract[market.id] ?? 0];
                }),
              ),
            );
            const adjusted = applySignalAdjustments(
              family,
              family.bucketOrder.map((bucket) => ({
                id: bucket.id,
                label: bucket.label,
                role: bucket.role,
                slug: bucket.polymarketSlug,
                deadlineAt: bucket.resolvesAt,
                outcome: "YES by date",
                weight: bucket.weight,
                modelProbability: round(baselineModelByDate[bucket.id] ?? 0),
                marketProbability: 0,
                gap: 0,
              })),
              buildSignalRows(family, { ...payload, signals: { ...payload.signals, signals } }, {}),
            );
            return Object.fromEntries(adjusted.map((bucket) => [bucket.id, bucket.modelProbability]));
          },
        })
      : undefined,
    signals,
    signalTimeline: signals,
    signalMatrix: family.relevantSignalTypes.map((signalType) => ({
      signalType,
      bucketImpacts: family.bucketOrder.map((bucket) => ({
        bucketId: bucket.id,
        value: round((family.signalBucketInfluence[signalType]?.[bucket.id] ?? 0) * 100, 0),
      })),
    })),
    news,
    playbook: family.playbook,
    emptyStates: {
      news: news.length ? undefined : "News ingest not configured for this family.",
      playbook: family.playbook ? undefined : "No playbook written yet for this family.",
        replay: replay.length ? undefined : "No replay history available for this family yet.",
      signals: signals.length ? undefined : "No signals matched this family yet.",
    },
  };
}

function buildFamilyOutput(
  family: MarketFamily,
  payload: WorkspacePayload,
  weightOverrides: Record<string, number>,
  options: FamilyOutputOptions = {},
): FamilyEngineOutput {
  if (family.id === "hormuz-closure") return buildHormuzOutput(family, payload, weightOverrides, options);
  return buildIranOutput(family, payload, weightOverrides, options);
}

export function useFamilyEngineOutput(family: MarketFamily, options: FamilyOutputOptions = {}) {
  const includeReplay = options.includeReplay;
  const replayInterval = options.replayInterval;
  const [payload, setPayload] = useState<WorkspacePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightOverridesByFamily, setWeightOverridesByFamily] = useState<Record<string, Record<string, number>>>({});

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const scope = includeReplay || family.id === "hormuz-closure" ? "full" : "core";
      const response = await fetch(`/api/workspace?scope=${scope}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Workspace request failed: ${response.status}`);
      }
      const workspace = await response.json();

      setPayload({
        dashboard: workspace.dashboard as DashboardPayload,
        signals: workspace.signals as SignalsExplorerPayload,
        timeline: workspace.timeline as TimelinePayload,
        replay: workspace.replay as ReplayPayload | undefined,
        model2: workspace.model2 ?? null,
        snapshots: workspace.snapshots as SnapshotPayload | undefined,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Workspace data request failed.");
    } finally {
      setIsLoading(false);
    }
  }, [family.id, includeReplay]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS ?? 30_000);
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("signalos:family-weight-overrides");
    if (!raw) return;

    try {
      setWeightOverridesByFamily(JSON.parse(raw) as Record<string, Record<string, number>>);
    } catch {
      // Ignore corrupt session storage.
    }
  }, []);

  const setSignalWeight = useCallback((signalType: string, value: number) => {
    setWeightOverridesByFamily((current) => {
      const next = {
        ...current,
        [family.id]: {
          ...(current[family.id] ?? {}),
          [signalType]: value,
        },
      };
      window.sessionStorage.setItem("signalos:family-weight-overrides", JSON.stringify(next));
      return next;
    });
  }, [family.id]);

  const familyWeights = weightOverridesByFamily[family.id] ?? {};

  const outputs = useMemo(() => {
    if (!payload) return null;
    return Object.fromEntries(
      registeredFamilies.map((entry) => [
        entry.id,
        buildFamilyOutput(entry, payload, weightOverridesByFamily[entry.id] ?? {}, {
          includeReplay,
          replayInterval,
        }),
      ]),
    ) as Record<string, FamilyEngineOutput>;
  }, [includeReplay, payload, replayInterval, weightOverridesByFamily]);

  const familyOutput = outputs?.[family.id] ?? null;
  const summaries = useMemo<FamilySummary[]>(() => {
    if (!outputs) return [];
    return registeredFamilies.map((entry) => {
      const output = outputs[entry.id];
      return {
        familyId: entry.id,
        displayName: entry.displayName,
        shortThesis: entry.shortThesis,
        gap: output?.gap ?? 0,
      };
    });
  }, [outputs]);

  return {
    dashboardData: payload?.dashboard ?? null,
    model2Data: payload?.model2 ?? null,
    isLoading,
    error,
    refresh,
    familyOutput,
    summaries,
    signalWeights: familyWeights,
    setSignalWeight,
  };
}
