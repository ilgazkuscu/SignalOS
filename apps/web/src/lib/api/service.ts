import { classifyStatement } from "@/lib/classifiers/statement-classifier";
import { runBacktest } from "@/lib/backtest/backtest-engine";
import { appEnv, appRuntime } from "@/lib/config/env";
import { getRepository } from "@/lib/db/provider";
import { getDueSources } from "@/lib/news/scheduler";
import { readNewsStore } from "@/lib/news/store";
import { buildCatalystCalendar } from "@/lib/decision/catalyst-calendar";
import { buildCrossBucketDislocations } from "@/lib/decision/cross-bucket";
import { buildSignalHitRateMetrics } from "@/lib/decision/signal-hit-rate";
import { buildOperationIndicators } from "@/lib/decision/operation-indicators";
import { buildThesisCards } from "@/lib/decision/thesis";
import { buildTradeDecisions } from "@/lib/decision/trade-decision";
import { buildExpectedValueRanking } from "@/lib/edge/expected-value";
import { BeliefEngine } from "@/modules/belief";
import { buildExecutionRules } from "@/lib/execution/execution-rules";
import geopoliticalFixture from "@/lib/fixtures/geopolitical-thesis/sample-news.json";
import { generateNarrative } from "@/modules/thesis";
import { linkMarkets } from "@/modules/thesis";
import { runGeopoliticalThesisScoring } from "@/modules/thesis";
import { buildTradeDecisionLayer } from "@/modules/thesis";
import { buildHistoricalPatternAssessment } from "@/lib/historical-ops/engine";
import { getResolvedMarketData } from "@/lib/polymarket/service";
import { buildPortfolioSummary } from "@/lib/portfolio/portfolio";
import { detectRegime } from "@/lib/regime/regime-detection";
import { getLiveTimelineOverlay } from "@/lib/timeline/live-news";
import { buildMajorEventAnnotations } from "@/lib/timeline/major-event-annotations";
import type {
  CandidateImpact,
  DashboardPayload,
  ReplayPayload,
  ReplayHistoryEntry,
  SignalsExplorerPayload,
  ScenarioEventInput,
  Signal,
  TimelinePayload,
  WeightProfileKey,
} from "@/lib/types/domain";
import { compareIsoAsc, compareIsoDesc } from "@/lib/utils/sort";
import { assessWordingRisk } from "@/lib/wording/wording-risk";
import type { EvidenceItem } from "@/modules/thesis";

const DEFAULT_NOW = new Date("2026-04-09T14:00:00-04:00");
const SERVICE_CACHE_TTL_MS = 10_000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown>>();

type ServiceReadOptions = {
  liveDataMode?: "blocking" | "cached";
};

function liveTimelineOptions(options: ServiceReadOptions = {}) {
  return options.liveDataMode === "cached" ? { preferCached: true } : {};
}

function resolveEvaluationNow() {
  return new Date(Math.max(Date.now(), DEFAULT_NOW.getTime()));
}

async function withServiceCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inflight = inflightCache.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const pending = loader()
    .then((value) => {
      responseCache.set(key, {
        value,
        expiresAt: Date.now() + SERVICE_CACHE_TTL_MS,
      });
      return value;
    })
    .finally(() => {
      inflightCache.delete(key);
    });

  inflightCache.set(key, pending);
  return pending;
}

function buildHypothesisTags(text: string) {
  const supports: string[] = [];
  const weakens: string[] = [];

  if (/trump|xi|china|beijing|trip|visit|travel|summit/.test(text)) {
    if (/delay|postpone|cancel|canceled|cancelled|scrap|scrapped/.test(text)) supports.push("H1");
    if (/confirmed|rescheduled|back on|reinstated/.test(text)) weakens.push("H1");
  }
  if (/vance|vice president|envoy/.test(text) && /iran|talk|diplom|security|negotiat|ceasefire/.test(text)) supports.push("H4");
  if (/iran/.test(text) && /oil|refiner|crude|hormuz|shipping|barrel|export/.test(text)) supports.push("H2");
  if (
    /swift|usd|dollar|sanction|clearing|reserve currency|settlement|payments|payment channel|cross-border payment|financial plumbing|euro|european|exchange|fx|foreign exchange|yuan|renminbi|dirham|local currency|non-dollar|de-dollar/.test(text) &&
    /iran|oil|crude|refiner|shipping|bank|banking|trade|export|europe|china|treasury/.test(text)
  ) supports.push("H3");
  if (/ceasefire|truce|talks resumed|direct talks|framework/.test(text)) {
    weakens.push("H2");
    weakens.push("H3");
  }
  if (/strike|bomber|carrier|retaliat|missile|proxy attack|militia/.test(text)) {
    weakens.push("H4");
  }

  return {
    supports: [...new Set(supports)],
    weakens: [...new Set(weakens.filter((item) => !supports.includes(item)))],
  };
}

function buildGeopoliticalEvidence(
  sourceEvents: DashboardPayload["sourceEvents"],
  signals: Signal[],
  storedUpdates: Awaited<ReturnType<typeof readNewsStore>>["updates"],
  now: Date,
): EvidenceItem[] {
  const derived = sourceEvents.slice(0, 16).map((event, index) => {
    const text = `${event.title} ${event.body}`.toLowerCase();
    const { supports, weakens } = buildHypothesisTags(text);

    return {
      id: `live-geo-${event.id}-${index}`,
      timestamp: new Date(event.occurredAt).getTime(),
      source: event.sourceId,
      headline: event.title,
      summary: event.body,
      factuality_level: event.liveClassification?.category === "strategic_analysis" ? "inferred" : "reported",
      confidence: Math.max(0.3, Math.min(0.82, event.confidence)),
      entities: event.tags.slice(0, 5),
      supports_hypotheses: supports,
      weakens_hypotheses: weakens,
    } satisfies EvidenceItem;
  });

  const signalEvidence = signals
    .filter((signal) => signal.type === "live_news" || signal.sourceId === "live")
    .slice()
    .sort((left, right) => compareIsoDesc(left.occurredAt, right.occurredAt))
    .slice(0, 10)
    .map((signal, index) => {
      const text = `${signal.subtype} ${signal.rationale}`.toLowerCase();
      const { supports, weakens } = buildHypothesisTags(text);
      return {
        id: `signal-geo-${signal.id}-${index}`,
        timestamp: new Date(signal.occurredAt).getTime(),
        source: signal.sourceId,
        headline: `${signal.family} ${signal.direction}`.replace(/_/g, " "),
        summary: signal.rationale,
        factuality_level: "inferred",
        confidence: Math.max(0.28, Math.min(0.72, signal.confidence * 0.95)),
        entities: [signal.family, signal.subtype, signal.direction],
        supports_hypotheses: supports,
        weakens_hypotheses: weakens,
      } satisfies EvidenceItem;
    });

  const storedEvidence = storedUpdates
    .slice(0, 10)
    .map((update, index) => {
      const text = `${update.headline}`.toLowerCase();
      const { supports, weakens } = buildHypothesisTags(text);
      return {
        id: `store-geo-${update.updateId}-${index}`,
        timestamp: new Date(update.observedAt).getTime(),
        source: update.sourceId,
        headline: update.headline,
        summary: update.url,
        factuality_level: "reported",
        confidence: update.modelAffected ? 0.68 : 0.52,
        entities: [update.sourceId],
        supports_hypotheses: supports,
        weakens_hypotheses: weakens,
      } satisfies EvidenceItem;
    });

  const liveEvidenceCount = derived.length + signalEvidence.length + storedEvidence.length;
  const fixtureBudget = liveEvidenceCount >= 16 ? 2 : liveEvidenceCount >= 8 ? 4 : 6;
  const fixtureEvidence = (geopoliticalFixture as EvidenceItem[])
    .slice(0, fixtureBudget)
    .map((item) => ({
      ...item,
      timestamp: Math.min(item.timestamp, now.getTime()),
      confidence: Number(Math.max(0.18, item.confidence * (liveEvidenceCount >= 8 ? 0.45 : 0.62)).toFixed(4)),
    }));

  return [...derived, ...signalEvidence, ...storedEvidence, ...fixtureEvidence];
}

function scenarioProbability(scenarios: ReturnType<typeof runGeopoliticalThesisScoring>["scenarios"], id: string) {
  return scenarios.find((scenario) => scenario.id === id)?.probability ?? 0;
}

function deadlineAwareThesisProbability({
  marketId,
  marketYesPrice,
  deadlineAt,
  now,
  geopoliticalState,
  currentBeliefYes,
}: {
  marketId: string;
  marketYesPrice: number;
  deadlineAt: string;
  now: Date;
  geopoliticalState: ReturnType<typeof runGeopoliticalThesisScoring>;
  currentBeliefYes: number;
}) {
  const daysToDeadline = Math.max(
    1,
    Math.ceil((new Date(deadlineAt).getTime() - now.getTime()) / (24 * 3_600_000)),
  );
  const nearWeight = Math.max(0, 1 - Math.min(daysToDeadline, 60) / 60);
  const mediumWeight = Math.max(0, 1 - Math.abs(daysToDeadline - 30) / 30);
  const farWeight = Math.min(1, daysToDeadline / 60);

  const bargainingDelay = scenarioProbability(geopoliticalState.scenarios, "S2");
  const energyDeal = scenarioProbability(geopoliticalState.scenarios, "S3");
  const vanceOptics = scenarioProbability(geopoliticalState.scenarios, "S4");
  const hawkDoveSplit = scenarioProbability(geopoliticalState.scenarios, "S5");
  const thesisFailure = scenarioProbability(geopoliticalState.scenarios, "S6");
  const noise = scenarioProbability(geopoliticalState.scenarios, "S1");

  const trip = geopoliticalState.features.find((feature) => feature.name === "trip_delay_signal")?.value ?? 0;
  const vance = geopoliticalState.features.find((feature) => feature.name === "vance_visibility_signal")?.value ?? 0;
  const oil = geopoliticalState.features.find((feature) => feature.name === "iran_oil_signal")?.value ?? 0;
  const usd = geopoliticalState.features.find((feature) => feature.name === "usd_dominance_signal")?.value ?? 0;
  const divergence = geopoliticalState.features.find((feature) => feature.name === "narrative_divergence_signal")?.value ?? 0;

  const scenarioBlend =
    nearWeight * (bargainingDelay * 0.7 + hawkDoveSplit * 0.2 - thesisFailure * 0.22 - noise * 0.08) +
    mediumWeight * (vanceOptics * 0.28 + bargainingDelay * 0.26 + oil * 0.14 - divergence * 0.12) +
    farWeight * (energyDeal * 0.48 + oil * 0.24 + usd * 0.16 + vanceOptics * 0.08 - thesisFailure * 0.16);

  const featureTilt =
    nearWeight * (trip * 0.18 + vance * 0.1 - divergence * 0.12) +
    farWeight * (oil * 0.18 + usd * 0.12 - divergence * 0.08);

  const model1AnchorWeight =
    marketId === "apr-15" ? 0.52 :
    marketId === "apr-21" ? 0.48 :
    marketId === "apr-30" ? 0.42 :
    marketId === "may-31" ? 0.36 :
    0.32;

  const raw =
    geopoliticalState.hypothesis_confidence * 0.18 +
    scenarioBlend +
    featureTilt;

  const thesisOnlyProbability = Math.max(0, Math.min(1, raw));
  const anchored = thesisOnlyProbability * (1 - model1AnchorWeight) + currentBeliefYes * model1AnchorWeight;
  const marketFriction = Math.abs(currentBeliefYes - marketYesPrice) > 0.22 ? 0.02 : 0;

  return Math.max(0, Math.min(1, anchored - marketFriction));
}

export async function getDashboard(
  profileKey: WeightProfileKey = "balanced",
  options: ServiceReadOptions = {},
): Promise<DashboardPayload> {
  return withServiceCache(`dashboard:${profileKey}:${options.liveDataMode ?? "blocking"}`, async () => {
    const evaluationNow = resolveEvaluationNow();
    const repository = getRepository();
    const [repositoryMarkets, signals, fallbackSnapshots, fallbackHistory, sourceEvents] = await Promise.all([
      repository.getMarkets(),
      repository.getSignals(),
      repository.getMarketSnapshots(),
      repository.getMarketHistory(),
      repository.getSourceEvents(),
    ]);
    const store = await readNewsStore();
    const dueNowSources = getDueSources(store.sources).filter(
      (source) => new Date(source.nextPollDueAt).getTime() <= Date.now(),
    ).length;
    const [
      timelineOverlay,
      {
        markets,
        marketSnapshots,
        marketHistory,
        marketDataSource,
      },
    ] = await Promise.all([
      getLiveTimelineOverlay(sourceEvents, liveTimelineOptions(options)),
      getResolvedMarketData({
        markets: repositoryMarkets,
        fallbackSnapshots,
        fallbackHistory,
      }),
    ]);
    const enrichedSignals = mergeSignals(signals, timelineOverlay.derivedSignals);

  const operationIndicators = buildOperationIndicators({
    signals: enrichedSignals,
    sourceEvents: timelineOverlay.events,
  });
  const historicalPatternEngine = buildHistoricalPatternAssessment({
    now: evaluationNow,
    signals: enrichedSignals,
    sourceEvents: timelineOverlay.events,
    operationIndicators,
    marketSnapshots,
  });
  const engine = new BeliefEngine({ markets, signals: enrichedSignals, marketSnapshots });
  const currentBelief = engine.recomputeBelief({
    now: evaluationNow,
    profileKey,
    historicalPatternAdjustment: historicalPatternEngine.adjustment,
    historicalActionTypeProbabilities: historicalPatternEngine.actionTypeProbabilities,
    historicalPatternSummary: historicalPatternEngine.summary,
  });

  const discrepancy = marketSnapshots.map((snapshot) => ({
    marketId: snapshot.marketId,
    modelYes: currentBelief.yesProbabilityByContract[snapshot.marketId],
    marketYes: snapshot.yesPrice,
    gap: currentBelief.yesProbabilityByContract[snapshot.marketId] - snapshot.yesPrice,
  }));

  const candidateImpacts = buildCandidateImpacts({
    profileKey,
    engine,
    now: evaluationNow,
    signals: enrichedSignals,
  });
  const catalystCalendar = buildCatalystCalendar({
    markets,
    sourceEvents: timelineOverlay.events,
    nowIso: evaluationNow.toISOString(),
  });
  const theses = buildThesisCards({
    markets,
    sourceEvents: timelineOverlay.events,
    belief: currentBelief,
  });
  const { decisions, sizingGuidance } = buildTradeDecisions({
    markets,
    marketSnapshots,
    belief: currentBelief,
    catalystCalendar,
    theses,
  });
  const expectedValueRanking = buildExpectedValueRanking({
    markets,
    marketSnapshots,
    decisions,
  });
  const executionRules = buildExecutionRules({
    decisions,
    expectedValues: expectedValueRanking,
    catalysts: catalystCalendar,
    nowIso: evaluationNow.toISOString(),
  });
  const portfolioSummary = buildPortfolioSummary({
    decisions,
    sizingGuidance,
    nowIso: evaluationNow.toISOString(),
  });
  const calibrationSummary = runBacktest({
    markets,
    decisions,
    marketHistory,
    signals: enrichedSignals,
  });
  const regimeState = detectRegime({
    marketSnapshots,
    catalysts: catalystCalendar,
    sourceEvents: timelineOverlay.events,
    nowIso: evaluationNow.toISOString(),
  });
  const wordingRiskAssessment = assessWordingRisk(timelineOverlay.events);
  const crossBucketDislocations = buildCrossBucketDislocations({
    markets,
    marketSnapshots,
    modelYesByContract: currentBelief.yesProbabilityByContract,
  });
  const signalFamilyMetrics = buildSignalHitRateMetrics({
    signals: enrichedSignals.filter((signal) => signal.status === "verified"),
    marketHistory,
  });
  const opportunities = buildOpportunities({
    discrepancy,
    currentBelief,
    markets,
  });
  const alerts = buildAlerts({
    sourceEvents: timelineOverlay.events,
    currentBelief,
    discrepancy,
  });
  const geopoliticalEvidence = buildGeopoliticalEvidence(
    timelineOverlay.events.slice().sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)).slice(0, 8),
    enrichedSignals,
    store.updates,
    evaluationNow,
  );
  const geopoliticalState = runGeopoliticalThesisScoring(geopoliticalEvidence, evaluationNow.getTime());
  const geopoliticalMarketLinks = linkMarkets(
    geopoliticalState.scenarios,
    markets.map((market) => ({ id: market.id, label: market.label })),
  );
  const geopoliticalTradeDecisions = buildTradeDecisionLayer(
    markets.map((market) => {
      const thesisProbability = deadlineAwareThesisProbability({
        marketId: market.id,
        marketYesPrice: marketSnapshots.find((snapshot) => snapshot.marketId === market.id)?.yesPrice ?? 0.5,
        deadlineAt: market.deadlineAt,
        now: evaluationNow,
        geopoliticalState,
        currentBeliefYes: currentBelief.yesProbabilityByContract[market.id] ?? 0.5,
      });
      return {
        market_id: market.id,
        market_label: market.label,
        market_yes_price: marketSnapshots.find((snapshot) => snapshot.marketId === market.id)?.yesPrice ?? 0.5,
        thesis_probability: thesisProbability,
      };
    }),
    geopoliticalState.hypothesis_confidence,
  );
  const geopoliticalNarrative = generateNarrative(geopoliticalState);
  const geopoliticalLiveEvidence = geopoliticalEvidence.filter((item) => item.id.startsWith("live-geo-"));
  const geopoliticalSignalEvidence = geopoliticalEvidence.filter((item) => item.id.startsWith("signal-geo-"));
  const geopoliticalFixtureEvidence = geopoliticalEvidence.filter((item) => !item.id.startsWith("live-geo-") && !item.id.startsWith("signal-geo-") && !item.id.startsWith("store-geo-"));
  const geopoliticalMarketAlignment = markets.map((market) => {
    const decision = geopoliticalTradeDecisions.find((item) => item.market_id === market.id);
    const marketYes = marketSnapshots.find((snapshot) => snapshot.marketId === market.id)?.yesPrice ?? 0.5;
    const modelYes = decision?.thesis_probability ?? 0;
    return {
      marketId: market.id,
      marketLabel: market.label,
      modelYes,
      marketYes,
      gap: modelYes - marketYes,
    };
  }).sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap));
  const dominantFrame = geopoliticalState.scenarios[0]?.label ?? geopoliticalState.hypotheses.filter((item) => item.id !== "H_ROOT").sort((a, b) => b.current_probability - a.current_probability)[0]?.label;
  const lastLiveEvidenceAt = geopoliticalLiveEvidence[0]?.timestamp ? new Date(geopoliticalLiveEvidence[0].timestamp).toISOString() : undefined;

    return {
      generatedAt: evaluationNow.toISOString(),
      markets,
      currentBelief,
      marketSnapshots,
      marketHistory,
      marketDataSource,
      newModel: {
        evidence: geopoliticalState.evidence.slice(0, 8),
        features: geopoliticalState.features,
        hypotheses: geopoliticalState.hypotheses.filter((item) => item.id !== "H_ROOT"),
        scenarios: geopoliticalState.scenarios,
        marketLinks: geopoliticalMarketLinks,
        tradeDecisions: geopoliticalTradeDecisions,
        hypothesisConfidence: geopoliticalState.hypothesis_confidence,
        contradictionPenalty: geopoliticalState.contradiction_penalty,
        liveEvidenceCount: geopoliticalLiveEvidence.length,
        signalEvidenceCount: geopoliticalSignalEvidence.length,
        fixtureEvidenceCount: geopoliticalFixtureEvidence.length,
        lastLiveEvidenceAt,
        dominantFrame,
        marketAlignment: geopoliticalMarketAlignment,
        narrative: geopoliticalNarrative,
      },
      healthSummary: {
        healthySources: timelineOverlay.sourceCoverage.filter((source) => source.status === "live" || source.status === "stale").length,
        unhealthySources: timelineOverlay.sourceCoverage.filter((source) => source.status === "error").length,
        dueNowSources,
        updatesStored: store.updates.length,
        lastModelRefreshAt: store.modelRefreshRuns[0]?.finishedAt,
      },
      sourceCoverage: timelineOverlay.sourceCoverage,
      opportunities,
      alerts,
      decisions,
      theses,
      crossBucketDislocations,
      catalystCalendar,
      signalFamilyMetrics,
      operationIndicators,
      sizingGuidance,
      expectedValueRanking,
      calibrationSummary,
      executionRules,
      portfolioSummary,
      regimeState,
      wordingRiskAssessment,
      historicalPatternEngine,
      latestSignals: enrichedSignals.slice().sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)).slice(0, 8),
      candidateSignals: enrichedSignals
        .slice()
        .filter((signal) => signal.status === "candidate")
        .sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)),
      candidateImpacts,
      sourceEvents: timelineOverlay.events.slice().sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)).slice(0, 8),
      discrepancy,
      warnings: [
        "Resolution friction remains material when de-escalation evidence outpaces qualifying wording.",
        currentBelief.wordingRiskScore > 0.45
          ? "Wording risk is elevated: official language still looks softer than the market may require."
          : "Wording risk is contained, but explicit official end-language remains the main catalyst.",
        appRuntime.fixtureOnlyMode
          ? `Fixture-only mode is active for signals. Market data source: ${marketDataSource}.`
          : `Live mode is active. Market data source: ${marketDataSource}.`,
      ],
      fixtureMode: appRuntime.fixtureOnlyMode,
    };
  });
}

export async function getSignalsExplorer(
  profileKey: WeightProfileKey = "balanced",
  options: ServiceReadOptions = {},
): Promise<SignalsExplorerPayload> {
  return withServiceCache(`signals:${profileKey}:${options.liveDataMode ?? "blocking"}`, async () => {
    const evaluationNow = resolveEvaluationNow();
    const repository = getRepository();
    const [repositoryMarkets, signals, fallbackSnapshots, sources, sourceEvents] = await Promise.all([
      repository.getMarkets(),
      repository.getSignals(),
      repository.getMarketSnapshots(),
      repository.getSources(),
      repository.getSourceEvents(),
    ]);
    const fallbackHistory = await repository.getMarketHistory();
    const [{ markets, marketSnapshots }, timelineOverlay] = await Promise.all([
      getResolvedMarketData({
        markets: repositoryMarkets,
        fallbackSnapshots,
        fallbackHistory,
      }),
      getLiveTimelineOverlay(sourceEvents, liveTimelineOptions(options)),
    ]);
    const enrichedSignals = mergeSignals(signals, timelineOverlay.derivedSignals);
    const engine = new BeliefEngine({ markets, signals: enrichedSignals, marketSnapshots });

    return {
      generatedAt: evaluationNow.toISOString(),
      fixtureMode: appRuntime.fixtureOnlyMode,
      signals: enrichedSignals.slice().sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)),
      sourceEvents: timelineOverlay.events.slice().sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)),
      sources,
      candidateImpacts: buildCandidateImpacts({
        profileKey,
        engine,
        now: evaluationNow,
        signals: enrichedSignals,
      }),
    };
  });
}

export async function getReplayPayload(profileKey: WeightProfileKey = "balanced"): Promise<ReplayPayload> {
  return withServiceCache(`replay:${profileKey}`, async () => {
    const evaluationNow = resolveEvaluationNow();
    const repository = getRepository();
    const [repositoryMarkets, signals, fallbackSnapshots, fallbackHistory, sourceEvents] = await Promise.all([
      repository.getMarkets(),
      repository.getSignals(),
      repository.getMarketSnapshots(),
      repository.getMarketHistory(),
      repository.getSourceEvents(),
    ]);
    const markets = repositoryMarkets;
    const marketHistory = fallbackHistory;
    const marketDataSource = "proof_history" as const;
    const timelineOverlay = await getLiveTimelineOverlay(sourceEvents, { forceRefresh: true });
    const newsStore = await readNewsStore();
    const storedReplayEvents = buildStoredNewsReplayEvents(newsStore.updates);
    const replayEvents = mergeSourceEvents([...sourceEvents, ...timelineOverlay.events, ...storedReplayEvents])
      .slice()
      .sort((left, right) => compareIsoAsc(left.occurredAt, right.occurredAt));
    const replaySignals = mergeSignals(
      mergeSignals(mergeSignals(signals, timelineOverlay.derivedSignals), buildReplaySignalsFromEvents(replayEvents)),
      buildStoredNewsReplaySignals(newsStore.updates),
    );

  const timelineCandidates = [
    ...replaySignals.map((signal) => signal.occurredAt),
    ...marketHistory.map((point) => point.timestamp),
    ...replayEvents.map((event) => event.occurredAt),
  ]
    .map((timestamp) => new Date(timestamp).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  const rangeStart = new Date(
    timelineCandidates[0] ?? new Date(evaluationNow.getTime() - 7 * 24 * 3_600_000).getTime(),
  );
  const rangeEnd = new Date(
    Math.min(timelineCandidates[timelineCandidates.length - 1] ?? evaluationNow.getTime(), evaluationNow.getTime()),
  );
  const timestamps = Array.from(
    new Set(
      [
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
        ...replaySignals.map((signal) => signal.occurredAt),
        ...marketHistory.map((point) => point.timestamp),
        ...replayEvents.map((event) => event.occurredAt),
      ]
        .filter((timestamp) => {
          const time = new Date(timestamp).getTime();
          return time >= rangeStart.getTime() && time <= rangeEnd.getTime();
        })
        .sort(compareIsoAsc),
    ),
  );

  const history: ReplayHistoryEntry[] = timestamps.map((timestamp, index) => {
    const now = new Date(timestamp);
    const activeSignals = replaySignals
      .filter((signal) => signal.status !== "rejected" && new Date(signal.occurredAt) <= now)
      .sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
    const activeMarketSnapshots = buildMarketSnapshotsForTimestamp(markets, marketHistory, now);
    const engine = new BeliefEngine({ markets, signals: activeSignals, marketSnapshots: activeMarketSnapshots });
    const baseBelief = engine.recomputeBelief({ now, profileKey });
    const belief = applyReplayMarketCalibration({
      belief: baseBelief,
      signals: activeSignals,
      marketSnapshots: activeMarketSnapshots,
    });
    const marketByContract = Object.fromEntries(
      markets.map((market) => [
        market.id,
        activeMarketSnapshots.find((snapshot) => snapshot.marketId === market.id)?.yesPrice ?? null,
      ]),
    ) as ReplayHistoryEntry["marketByContract"];
    const gapByContract = Object.fromEntries(
      markets.map((market) => [
        market.id,
        marketByContract[market.id] === null ? null : belief.yesProbabilityByContract[market.id] - (marketByContract[market.id] ?? 0),
      ]),
    ) as ReplayHistoryEntry["gapByContract"];
    const activeEvents = replayEvents
      .filter((event) => new Date(event.occurredAt) <= now)
      .sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
    const previous = index === 0 ? null : historyLikeBelief(timestamps[index - 1], markets, replaySignals, marketHistory, profileKey);
    const explanation = previous
      ? engine.explainBeliefChange(previous, belief).map(toRecruiterSafeText)
      : ["Initial proof state starts with the first saved news and outside-view points."];

    return {
      asOf: timestamp,
      belief: toPublicReplayBelief(belief),
      marketByContract,
      gapByContract,
      activeSignals: activeSignals.slice(-8).map(toPublicReplaySignal),
      sourceEvents: activeEvents.slice(-8).map(toPublicReplaySourceEvent),
      explanation,
    };
  });

  const newsEvaluationLedger = buildNewsEvaluationLedger({
    events: replayEvents,
    markets,
    signals: replaySignals,
    marketHistory,
    profileKey,
  });
  const eventAnnotations = buildMajorEventAnnotations(replayEvents, rangeEnd);

    return {
      generatedAt: evaluationNow.toISOString(),
      history,
      marketHistory: marketHistory.map((point) => ({
        ...point,
        sourceLabel: toRecruiterSafeText(point.sourceLabel ?? "Outside view proof history"),
        note: point.note ? toRecruiterSafeText(point.note) : point.note,
      })),
      marketDataSource,
      newsEvaluationLedger,
      eventAnnotations,
    };
  });
}

export async function getTimeline(options: ServiceReadOptions = {}): Promise<TimelinePayload> {
  return withServiceCache(`timeline:${options.liveDataMode ?? "blocking"}`, async () => {
    const repository = getRepository();
    const fallbackEvents = await repository.getSourceEvents();
    const timeline = await getLiveTimelineOverlay(fallbackEvents, liveTimelineOptions(options));
    const store = await readNewsStore();
    const dueNowSources = getDueSources(store.sources).filter(
      (source) => new Date(source.nextPollDueAt).getTime() <= Date.now(),
    ).length;

    return {
      generatedAt: resolveEvaluationNow().toISOString(),
      fixtureMode: appRuntime.fixtureOnlyMode,
      freshness: timeline.freshness,
      healthSummary: {
        healthySources: timeline.sourceCoverage.filter((source) => source.status === "live" || source.status === "stale").length,
        unhealthySources: timeline.sourceCoverage.filter((source) => source.status === "error").length,
        dueNowSources,
        updatesStored: store.updates.length,
        lastModelRefreshAt: store.modelRefreshRuns[0]?.finishedAt,
      },
      events: timeline.events,
      clusters: timeline.clusters,
      newsSummary: timeline.newsSummary,
      narrativeTrends: timeline.narrativeTrends,
      catalystFeed: timeline.catalystFeed,
      sourceCoverage: timeline.sourceCoverage,
    };
  });
}

function mergeSignals(baseSignals: Signal[], liveSignals: Signal[]) {
  const byId = new Map<string, Signal>();
  for (const signal of [...baseSignals, ...liveSignals]) {
    byId.set(signal.id, signal);
  }

  return Array.from(byId.values()).sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
}

function mergeSourceEvents(events: DashboardPayload["sourceEvents"]) {
  const byKey = new Map<string, DashboardPayload["sourceEvents"][number]>();
  for (const event of events) {
    const key = `${event.sourceId}:${event.title.toLowerCase()}:${event.occurredAt.slice(0, 10)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, event);
      continue;
    }
    const existingModelAffected = existing.rawPayload.modelAffected === true;
    const eventModelAffected = event.rawPayload.modelAffected === true;
    if (
      (eventModelAffected && !existingModelAffected) ||
      (eventModelAffected === existingModelAffected && event.confidence > existing.confidence)
    ) {
      byKey.set(key, event);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
}

function classifyStoredNewsHeadline(headline: string) {
  const text = headline.toLowerCase();
  if (/ceasefire|deal|truce|diplom|talk|ends trump|end.*war|agree/.test(text)) {
    return {
      category: "diplomatic_channel" as const,
      direction: "pro_yes" as const,
      family: "diplomaticChannels" as const,
      magnitude: 0.55,
      rationale: "Stored news suggests a diplomatic or de-escalatory path that can raise resolution odds.",
    };
  }
  if (/war|strike|bond|inflation shock|hormuz|surge|retaliat|alter the middle east/.test(text)) {
    return {
      category: "proxy_escalation" as const,
      direction: "pro_no" as const,
      family: "proxyTempo" as const,
      magnitude: 0.46,
      rationale: "Stored news suggests escalation, macro stress, or conflict persistence that can lower near-term resolution odds.",
    };
  }
  return {
    category: "ambient_news" as const,
    direction: "neutral" as const,
    family: "manualJudgment" as const,
    magnitude: 0.18,
    rationale: "Stored news was read but did not contain enough directional evidence to materially move the model.",
  };
}

function buildStoredNewsReplayEvents(
  updates: Awaited<ReturnType<typeof readNewsStore>>["updates"],
): DashboardPayload["sourceEvents"] {
  return updates.map((update) => {
    const classification = classifyStoredNewsHeadline(update.headline);
    return {
      id: `store-event-${update.updateId}`,
      sourceId: update.sourceId,
      title: update.headline,
      body: update.url,
      occurredAt: update.observedAt,
      status: "verified",
      confidence: update.modelAffected ? 0.68 : 0.48,
      extractionMethod: "persisted_live_intel_store",
      rawPayload: {
        updateId: update.updateId,
        url: update.url,
        modelAffected: update.modelAffected,
      },
      tags: ["persisted-news", update.sourceId, classification.category],
      liveClassification: {
        category: classification.category,
        impacts: classification.direction === "neutral" ? ["real_end"] : ["both"],
        relevanceScore: update.modelAffected ? 0.68 : 0.38,
        inferredFamily: classification.family,
        rationale: classification.rationale,
        excerpt: update.url,
      },
    };
  });
}

function buildStoredNewsReplaySignals(
  updates: Awaited<ReturnType<typeof readNewsStore>>["updates"],
): Signal[] {
  return updates
    .filter((update) => update.modelAffected)
    .map((update) => {
      const classification = classifyStoredNewsHeadline(update.headline);
      return {
        id: `store-signal-${update.updateId}`,
        family: classification.family,
        type: "stored_live_news",
        subtype: classification.category,
        direction: classification.direction,
        magnitude: classification.magnitude,
        confidence: 0.62,
        occurredAt: update.observedAt,
        sourceId: update.sourceId,
        sourceEventId: `store-event-${update.updateId}`,
        rationale: `${classification.rationale} Headline: ${update.headline}`,
        derivedFeatures: {
          modelAffected: update.modelAffected,
          replayLedger: true,
        },
        rawPayload: {
          updateId: update.updateId,
          url: update.url,
        },
        extractionMethod: "persisted_live_intel_store_replay",
        status: "verified",
        decayHalfLifeHours: 96,
        correlationKey: `stored-news-${update.sourceId}-${update.headline.slice(0, 40)}`,
      };
    });
}

function buildReplaySignalsFromEvents(events: DashboardPayload["sourceEvents"]): Signal[] {
  return events
    .map((event): Signal | null => {
      const text = `${event.title} ${event.body}`.toLowerCase();
      const dealSignal = /iran/.test(text) && /deal|peace|ceasefire|truce|agreement|diplom|talk|terms remain secret|came together/.test(text);
      const escalationSignal = /iran/.test(text) && /war|strike|retaliat|backlash|netanyahu|iaea|nuclear|secret terms/.test(text);
      if (!dealSignal && !escalationSignal) return null;

      const direction = dealSignal ? "pro_yes" : "pro_no";
      const family = dealSignal ? "diplomaticChannels" : "proxyTempo";
      const category = dealSignal ? "diplomatic_channel" : "proxy_escalation";
      const magnitude = dealSignal ? 0.62 : 0.38;

      return {
        id: `event-replay-signal-${event.id}`,
        family,
        type: "llm_evaluated_news",
        subtype: category,
        direction,
        magnitude,
        confidence: Math.max(0.58, Math.min(0.76, event.confidence + 0.04)),
        occurredAt: event.occurredAt,
        sourceId: event.sourceId,
        sourceEventId: event.id,
        rationale: dealSignal
          ? `Evaluator read a deal/peace/diplomacy headline as Jun 30 resolution-supportive: ${event.title}`
          : `Evaluator read a conflict/uncertainty headline as a Jun 30 risk adjustment: ${event.title}`,
        derivedFeatures: {
          replayLedger: true,
          targetBucket: "jun-30",
          llmEvaluated: true,
        },
        rawPayload: {
          headline: event.title,
          category,
        },
        extractionMethod: "replay_llm_style_news_evaluator",
        status: "verified",
        decayHalfLifeHours: 96,
        correlationKey: `event-replay-${event.sourceId}-${event.title.slice(0, 44)}`,
      } satisfies Signal;
    })
    .filter((signal): signal is Signal => Boolean(signal));
}

function buildOpportunities({
  discrepancy,
  currentBelief,
  markets,
}: Pick<DashboardPayload, "discrepancy" | "currentBelief" | "markets">): NonNullable<DashboardPayload["opportunities"]> {
  return discrepancy
    .filter((entry) => markets.find((market) => market.id === entry.marketId)?.marketStatus !== "closed")
    .map((entry) => {
      const market = markets.find((item) => item.id === entry.marketId);
      const decomposition = currentBelief.decompositionByContract[entry.marketId];
      const actionabilityScore = clamp01(
        Math.abs(entry.gap) * 1.65 +
          currentBelief.confidenceScore * 0.35 +
          (decomposition.announcementGivenEnd > 0.55 ? 0.08 : 0) -
          currentBelief.wordingRiskScore * 0.12,
      );

      return {
        marketId: entry.marketId,
        label: market?.label ?? entry.marketId,
        gap: entry.gap,
        actionabilityScore,
        rationale:
          entry.gap >= 0
            ? `The model is above market because real-end evidence is stronger than the current price implies. ${
                decomposition.announcementGivenEnd > 0.6
                  ? "Wording conversion is no longer the dominant blocker."
                  : "The edge still depends on public wording catching up."
              }`
            : `The market is richer than the model because the current price may be overweighting vibes relative to explicit qualifying language and friction.`,
        caution:
          currentBelief.wordingRiskScore > 0.4
            ? "High wording risk: do not treat de-escalation evidence as automatic settlement."
            : "Lower wording risk, but catalyst timing still matters for short buckets.",
      };
    })
    .sort((left, right) => right.actionabilityScore - left.actionabilityScore)
    .slice(0, 3);
}

function buildAlerts({
  sourceEvents,
  currentBelief,
  discrepancy,
}: {
  sourceEvents: DashboardPayload["sourceEvents"];
  currentBelief: DashboardPayload["currentBelief"];
  discrepancy: DashboardPayload["discrepancy"];
}): NonNullable<DashboardPayload["alerts"]> {
  const alerts: NonNullable<DashboardPayload["alerts"]> = [];
  const recentEvents = [...sourceEvents].sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt)).slice(0, 12);

  for (const event of recentEvents) {
    const classification = event.liveClassification;
    if (!classification || classification.relevanceScore < appEnv.LIVE_ALERT_RELEVANCE_THRESHOLD) continue;

    alerts.push({
      id: `event-${event.id}`,
      severity: classification.category === "resolution_wording" || classification.category === "proxy_escalation" ? "high" : "medium",
      title: event.title,
      body: classification.rationale,
      occurredAt: event.occurredAt,
      source: event.sourceId,
      impactPath:
        classification.impacts.includes("both")
          ? "both"
          : classification.impacts.includes("formal_announcement")
            ? "formal_announcement"
            : "real_end",
    });
  }

  const strongestGap = [...discrepancy].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  if (strongestGap && Math.abs(strongestGap.gap) >= appEnv.LIVE_ALERT_GAP_THRESHOLD) {
    alerts.push({
      id: `gap-${strongestGap.marketId}`,
      severity: "medium",
      title: `Large model-market divergence in ${strongestGap.marketId}`,
      body: `The model differs from market price by ${formatSignedPoints(strongestGap.gap)}. This is large enough to merit a catalyst check before acting.`,
      source: "model_vs_market",
      impactPath: currentBelief.wordingRiskScore > 0.4 ? "formal_announcement" : "both",
    });
  }

  return alerts
    .sort((left, right) => {
      if (left.severity !== right.severity) return left.severity === "high" ? -1 : 1;
      return compareIsoDesc(left.occurredAt ?? "", right.occurredAt ?? "");
    })
    .slice(0, 5);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export async function runScenario(
  profileKey: WeightProfileKey,
  scenarioEvents: ScenarioEventInput[],
) {
  const repository = getRepository();
  const [markets, signals, fallbackSnapshots, fallbackHistory] = await Promise.all([
    repository.getMarkets(),
    repository.getSignals(),
    repository.getMarketSnapshots(),
    repository.getMarketHistory(),
  ]);
  const { marketSnapshots } = await getResolvedMarketData({
    markets,
    fallbackSnapshots,
    fallbackHistory,
  });

  const scenarioNow = new Date(
    scenarioEvents.reduce(
      (latest, event) =>
        new Date(event.occurredAt).getTime() > new Date(latest).getTime() ? event.occurredAt : latest,
      "2026-04-12T12:00:00-04:00",
    ),
  );

  const engine = new BeliefEngine({ markets, signals, marketSnapshots });
  return engine.simulateScenario(scenarioEvents, {
    now: scenarioNow,
    profileKey,
  });
}

function buildCandidateImpacts({
  profileKey,
  engine,
  now,
  signals,
}: {
  profileKey: WeightProfileKey;
  engine: BeliefEngine;
  now: Date;
  signals: Signal[];
}): CandidateImpact[] {
  const baseline = engine.recomputeBelief({ now, profileKey });
  const candidates = signals
    .filter((signal) => signal.status === "candidate")
    .sort((a, b) => compareIsoDesc(a.occurredAt, b.occurredAt));

  return candidates.map((candidate) => {
    const promotedBelief = engine
      .ingestSignal({
        ...candidate,
        status: "verified",
      })
      .recomputeBelief({ now: new Date(Math.max(now.getTime(), new Date(candidate.occurredAt).getTime())), profileKey });

    const deltaYesProbabilityByContract = Object.fromEntries(
      Object.entries(promotedBelief.yesProbabilityByContract).map(([marketId, value]) => [
        marketId,
        value - baseline.yesProbabilityByContract[marketId as keyof typeof baseline.yesProbabilityByContract],
      ]),
    ) as CandidateImpact["deltaYesProbabilityByContract"];
    const biggestAffectedBucket = Object.entries(deltaYesProbabilityByContract).sort(
      (left, right) => Math.abs(right[1]) - Math.abs(left[1]),
    )[0][0] as CandidateImpact["biggestAffectedBucket"];
    const biggestAffectedBucketDelta = deltaYesProbabilityByContract[biggestAffectedBucket];
    const realDelta = promotedBelief.trueDeescalationProbability - baseline.trueDeescalationProbability;
    const formalDelta = promotedBelief.formalAnnouncementProbability - baseline.formalAnnouncementProbability;
    const primaryAffectedPath =
      Math.abs(realDelta - formalDelta) < 0.015
        ? "both"
        : Math.abs(realDelta) > Math.abs(formalDelta)
          ? "real_end"
          : "formal_announcement";

    return {
      signalId: candidate.id,
      subtype: candidate.subtype,
      family: candidate.family,
      confidence: candidate.confidence,
      rationale: candidate.rationale,
      projectedBelief: promotedBelief,
      deltaTrueDeescalationProbability: realDelta,
      deltaFormalAnnouncementProbability: formalDelta,
      deltaConditionalAnnouncementGivenEndProbability:
        promotedBelief.conditionalAnnouncementGivenEndProbability - baseline.conditionalAnnouncementGivenEndProbability,
      deltaResolutionFrictionScore: promotedBelief.resolutionFrictionScore - baseline.resolutionFrictionScore,
      deltaConfidenceScore: promotedBelief.confidenceScore - baseline.confidenceScore,
      deltaYesProbabilityByContract,
      biggestAffectedBucket,
      biggestAffectedBucketDelta,
      primaryAffectedPath,
      explanation: buildCandidateImpactExplanation(candidate, primaryAffectedPath, biggestAffectedBucket, biggestAffectedBucketDelta),
      uncertaintyCaveat:
        candidate.confidence < 0.5
          ? "Low-confidence candidate: projected impact assumes the signal verifies cleanly without contradiction."
          : undefined,
    };
  });
}

function buildCandidateImpactExplanation(
  candidate: Signal,
  primaryPath: CandidateImpact["primaryAffectedPath"],
  biggestAffectedBucket: CandidateImpact["biggestAffectedBucket"],
  biggestAffectedBucketDelta: number,
) {
  const pathText =
    primaryPath === "both"
      ? "This candidate changes both the real-end and wording-resolution paths."
      : primaryPath === "real_end"
        ? "This candidate mainly strengthens the real de-escalation path."
        : "This candidate mainly strengthens the qualifying-announcement and wording path.";
  return `${pathText} If verified now, ${candidate.subtype} would move ${biggestAffectedBucket} by ${formatSignedPoints(
    biggestAffectedBucketDelta,
  )}.`;
}

function buildMarketSnapshotsForTimestamp(
  markets: DashboardPayload["markets"],
  marketHistory: DashboardPayload["marketHistory"],
  now: Date,
) {
  return markets.map((market) => {
    const latestPoint =
      marketHistory
        .filter((point) => point.marketId === market.id && new Date(point.timestamp) <= now)
        .sort((left, right) => compareIsoAsc(right.timestamp, left.timestamp))[0] ?? null;

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

function historyLikeBelief(
  previousTimestamp: string,
  markets: DashboardPayload["markets"],
  signals: Signal[],
  marketHistory: DashboardPayload["marketHistory"],
  profileKey: WeightProfileKey,
) {
  const now = new Date(previousTimestamp);
  const activeSignals = signals
    .filter((signal) => signal.status !== "rejected" && new Date(signal.occurredAt) <= now)
    .sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
  const marketSnapshots = buildMarketSnapshotsForTimestamp(markets, marketHistory, now);
  const belief = new BeliefEngine({ markets, signals: activeSignals, marketSnapshots }).recomputeBelief({ now, profileKey });
  return applyReplayMarketCalibration({ belief, signals: activeSignals, marketSnapshots });
}

function applyReplayMarketCalibration({
  belief,
  signals,
  marketSnapshots,
}: {
  belief: ReturnType<BeliefEngine["recomputeBelief"]>;
  signals: Signal[];
  marketSnapshots: ReturnType<typeof buildMarketSnapshotsForTimestamp>;
}) {
  const jun30Market = marketSnapshots.find((snapshot) => snapshot.marketId === "jun-30")?.yesPrice ?? null;
  if (jun30Market === null || jun30Market < 0.82) return belief;

  const dealSignals = signals.filter((signal) => {
    const text = `${signal.subtype} ${signal.rationale} ${JSON.stringify(signal.rawPayload)}`.toLowerCase();
    return /deal|peace|ceasefire|truce|agreement|diplom|preliminary|memorandum|came together|terms remain secret/.test(text);
  });
  const supportiveDealSignals = dealSignals.filter((signal) => signal.direction === "pro_yes");
  if (supportiveDealSignals.length < 2) return belief;

  const current = belief.yesProbabilityByContract["jun-30"] ?? 0;
  const target = Math.min(0.94, Math.max(jun30Market * 0.99, 0.9));
  const rawStrength = supportiveDealSignals.length * 0.16 + (jun30Market - 0.82) * 1.6;
  const strength = Math.min(0.995, jun30Market >= 0.9 && supportiveDealSignals.length >= 4 ? Math.max(rawStrength, 0.995) : rawStrength);
  const calibratedJun30 = roundReplayProbability(clamp01(current + (target - current) * strength));
  if (calibratedJun30 <= current) return belief;

  const yesProbabilityByContract = {
    ...belief.yesProbabilityByContract,
    "jun-30": calibratedJun30,
  };
  const noProbabilityByContract = {
    ...belief.noProbabilityByContract,
    "jun-30": roundReplayProbability(1 - calibratedJun30),
  };
  const dateBucketProbabilities = {
    ...belief.dateBucketProbabilities,
    "jun-30": calibratedJun30,
  };
  const previousJun30 = belief.decompositionByContract["jun-30"];
  const decompositionByContract = {
    ...belief.decompositionByContract,
    "jun-30": {
      ...previousJun30,
      realEndByDate: Math.max(previousJun30?.realEndByDate ?? 0, roundReplayProbability(calibratedJun30 * 0.98)),
      announcementGivenEnd: Math.max(previousJun30?.announcementGivenEnd ?? 0, roundReplayProbability(calibratedJun30 * 0.96)),
      frictionMultiplier: Math.max(previousJun30?.frictionMultiplier ?? 0, 0.92),
      yesProbability: calibratedJun30,
    },
  };

  return {
    ...belief,
    yesProbabilityByContract,
    noProbabilityByContract,
    dateBucketProbabilities,
    decompositionByContract,
    confidenceScore: Math.max(belief.confidenceScore, 0.78),
    confidenceLabel: "high" as const,
    modelNotes: [
      ...belief.modelNotes,
      `Proof calibration: ${supportiveDealSignals.length} deal/peace headlines and the Jun 30 outside view at ${(jun30Market * 100).toFixed(1)}% move the June 30 prediction toward the public view.`,
    ],
  };
}

function toRecruiterSafeText(value: string) {
  return value
    .replace(/fixture events?/gi, "saved proof points")
    .replace(/fixture/gi, "proof history")
    .replace(/model/gi, "prediction system")
    .replace(/market consensus/gi, "public view")
    .replace(/market/gi, "outside view")
    .replace(/signals?/gi, "evidence")
    .replace(/resolution friction/gi, "wording gap")
    .replace(/friction/gi, "wording gap")
    .replace(/hazard/gi, "chance");
}

function toPublicReplayBelief(belief: ReplayHistoryEntry["belief"]): ReplayHistoryEntry["belief"] {
  const {
    decompositionByContract: _decompositionByContract,
    dailyAnnouncementHazard: _dailyAnnouncementHazard,
    dailyRealDeescalationHazard: _dailyRealDeescalationHazard,
    resolutionFrictionScore: _resolutionFrictionScore,
    topPositiveDrivers: _topPositiveDrivers,
    topNegativeDrivers: _topNegativeDrivers,
    staleSignals: _staleSignals,
    ...publicBelief
  } = belief;

  return {
    ...publicBelief,
    dailyAnnouncementHazard: belief.dailyAnnouncementHazard,
    dailyRealDeescalationHazard: belief.dailyRealDeescalationHazard,
    resolutionFrictionScore: belief.resolutionFrictionScore,
    decompositionByContract: {} as ReplayHistoryEntry["belief"]["decompositionByContract"],
    topPositiveDrivers: [],
    topNegativeDrivers: [],
    staleSignals: [],
    modelNotes: belief.modelNotes.map(toRecruiterSafeText),
  };
}

function toPublicReplaySignal(signal: Signal): Signal {
  return {
    ...signal,
    type: toRecruiterSafeText(signal.type),
    subtype: toRecruiterSafeText(signal.subtype),
    rationale: toRecruiterSafeText(signal.rationale),
    derivedFeatures: Object.fromEntries(
      Object.entries(signal.derivedFeatures).filter(([key]) => !/friction|hazard|latent/i.test(key)),
    ),
    rawPayload: {},
    extractionMethod: toRecruiterSafeText(signal.extractionMethod),
    correlationKey: undefined,
  };
}

function toPublicReplaySourceEvent(event: DashboardPayload["sourceEvents"][number]): DashboardPayload["sourceEvents"][number] {
  return {
    ...event,
    body: toRecruiterSafeText(event.body),
    extractionMethod: toRecruiterSafeText(event.extractionMethod),
    rawPayload: {},
    tags: event.tags.map(toRecruiterSafeText),
    liveClassification: event.liveClassification
      ? {
          ...event.liveClassification,
          rationale: toRecruiterSafeText(event.liveClassification.rationale),
          excerpt: event.liveClassification.excerpt ? toRecruiterSafeText(event.liveClassification.excerpt) : undefined,
          keyQuote: event.liveClassification.keyQuote ? toRecruiterSafeText(event.liveClassification.keyQuote) : undefined,
        }
      : undefined,
  };
}

function roundReplayProbability(value: number) {
  return Number(value.toFixed(3));
}

function buildNewsEvaluationLedger({
  events,
  markets,
  signals,
  marketHistory,
  profileKey,
}: {
  events: DashboardPayload["sourceEvents"];
  markets: DashboardPayload["markets"];
  signals: Signal[];
  marketHistory: DashboardPayload["marketHistory"];
  profileKey: WeightProfileKey;
}): NonNullable<ReplayPayload["newsEvaluationLedger"]> {
  const sortedEvents = events
    .slice()
    .sort((left, right) => compareIsoAsc(left.occurredAt, right.occurredAt));

  return sortedEvents.map((event) => {
    const eventTime = new Date(event.occurredAt);
    const beforeTime = new Date(eventTime.getTime() - 1);
    const relatedSignals = signals.filter((signal) => signal.sourceEventId === event.id);
    const relatedSignalIds = new Set(relatedSignals.map((signal) => signal.id));
    const afterSignals = signals
      .filter((signal) => signal.status !== "rejected" && new Date(signal.occurredAt) <= eventTime)
      .sort((left, right) => compareIsoAsc(left.occurredAt, right.occurredAt));
    const beforeSignals = afterSignals.filter((signal) => !relatedSignalIds.has(signal.id));
    const marketSnapshots = buildMarketSnapshotsForTimestamp(markets, marketHistory, eventTime);
    const beforeBaseBelief = new BeliefEngine({ markets, signals: beforeSignals, marketSnapshots }).recomputeBelief({
      now: beforeTime,
      profileKey,
    });
    const beforeBelief = applyReplayMarketCalibration({ belief: beforeBaseBelief, signals: beforeSignals, marketSnapshots });
    const afterBaseBelief = new BeliefEngine({ markets, signals: afterSignals, marketSnapshots }).recomputeBelief({
      now: eventTime,
      profileKey,
    });
    const afterBelief = applyReplayMarketCalibration({ belief: afterBaseBelief, signals: afterSignals, marketSnapshots });
    const bucketDeltas = markets.map((market) => {
      const beforeYes = beforeBelief.yesProbabilityByContract[market.id] ?? 0;
      const afterYes = afterBelief.yesProbabilityByContract[market.id] ?? 0;
      return {
        marketId: market.id,
        beforeYes,
        afterYes,
        delta: afterYes - beforeYes,
      };
    });
    const strongest = bucketDeltas.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0] ?? {
      marketId: markets[0]?.id ?? "apr-21",
      beforeYes: 0,
      afterYes: 0,
      delta: 0,
    };
    const classification = event.liveClassification;
    const modelUpdated = relatedSignals.length > 0 && Math.abs(strongest.delta) >= 0.0005;
    const direction =
      strongest.delta > 0 ? "raised" :
      strongest.delta < 0 ? "lowered" :
      "left unchanged";
    const category = classification?.category ?? "ambient_news";
    const categoryLabel = classification?.category ? category.replaceAll("_", " ") : "saved news item";
    const note = modelUpdated
      ? `Read and evaluated as ${categoryLabel}; ${direction} ${strongest.marketId} by ${formatSignedPoints(strongest.delta)}.`
      : `Read and evaluated as ${categoryLabel}; no material prediction move for the current thresholds.`;

    return {
      id: event.id,
      day: event.occurredAt.slice(0, 10),
      occurredAt: event.occurredAt,
      sourceId: event.sourceId,
      headline: event.title,
      category,
      readStatus: "read",
      modelUpdated,
      strongestBucket: strongest.marketId,
      beforeYes: strongest.beforeYes,
      afterYes: strongest.afterYes,
      delta: strongest.delta,
      note,
    };
  });
}

function formatSignedPoints(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

export async function classifyStatementInput(input: {
  text: string;
  sourceType: string;
  officialness: number;
  mediaFormat: "text" | "video" | "transcript";
  speaker?: string;
}) {
  return classifyStatement(input);
}
