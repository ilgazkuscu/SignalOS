import type {
  EvidenceItem as GeopoliticalEvidenceItem,
  Feature as GeopoliticalFeature,
  HypothesisNode as GeopoliticalHypothesisNode,
  MarketLink as GeopoliticalMarketLink,
  Scenario as GeopoliticalScenario,
  TradeDecision as GeopoliticalTradeDecision,
} from "@/lib/geopolitical-thesis/types";

export type MarketId =
  | "apr-15"
  | "apr-21"
  | "apr-30"
  | "may-31"
  | "jun-30";

export type SignalFamilyKey =
  | "trumpTelemetry"
  | "leaderSchedule"
  | "cabinetAlignment"
  | "forcePosture"
  | "strategicFlights"
  | "diplomaticChannels"
  | "proxyTempo"
  | "pizzaIndex"
  | "resolutionWording"
  | "marketMicrostructure"
  | "macroConfirmation"
  | "manualJudgment";

export type SignalDirection = "pro_yes" | "pro_no" | "neutral";
export type SignalStatus = "candidate" | "verified" | "rejected";
export type ConfidenceLabel = "low" | "medium" | "high";
export type WeightProfileKey = "conservative" | "balanced" | "opportunistic";
export type ActionType =
  | "initiation"
  | "escalation"
  | "sustainment"
  | "operational_pause"
  | "coercive_settlement"
  | "genuine_termination"
  | "retrograde_with_cover"
  | "withdrawal_without_termination";

export interface ResolutionCriteria {
  officialAnnouncementRequired: boolean;
  truthSocialCounts: boolean;
  videoStatementCounts: boolean;
  unnamedSourcesDisallowed: boolean;
  officialSourcePriority: "strict" | "preferred" | "blended";
  clearEndLanguageRequired: boolean;
  timezone: "America/New_York";
  deadlineAt: string;
  interpretationNotes: string;
}

export interface MarketDefinition {
  id: MarketId;
  slug: string;
  label: string;
  polymarketUrl?: string;
  deadlineAt: string;
  marketStatus?: "open" | "closed";
  closedAt?: string;
  resolvedOutcome?: "yes" | "no" | null;
  resolutionCriteria: ResolutionCriteria;
}

export interface PriorBeliefCurve {
  asOf: string;
  realDeescalationByDate: Record<MarketId, number>;
  formalAnnouncementByDate: Record<MarketId, number>;
  quietFadeProbability: number;
  announcementLagMeanDays: number;
  baselineHostilities: number;
  notes: string[];
}

export interface SourceMeta {
  id: string;
  name: string;
  sourceType: string;
  officialness: number;
  reliability: number;
}

export interface SourceEvent {
  id: string;
  sourceId: string;
  title: string;
  body: string;
  occurredAt: string;
  status: SignalStatus;
  confidence: number;
  extractionMethod: string;
  rawPayload: Record<string, unknown>;
  tags: string[];
  liveClassification?: {
    category:
      | "resolution_wording"
      | "force_posture"
      | "diplomatic_channel"
      | "proxy_escalation"
      | "strategic_analysis"
      | "ambient_news";
    impacts: Array<"real_end" | "formal_announcement" | "both">;
    relevanceScore: number;
    inferredFamily?: SignalFamilyKey;
    rationale: string;
    excerpt?: string;
    keyQuote?: string;
  };
}

export interface CoverageSource {
  id: string;
  sourceId: string;
  sourceName: string;
  headline: string;
  url?: string;
  occurredAt: string;
  relevanceTag?: string;
  confidence: number;
}

export interface EventCluster {
  id: string;
  canonicalTitle: string;
  summary: string;
  occurredAt: string;
  sourceCount: number;
  sources: CoverageSource[];
  category: NonNullable<SourceEvent["liveClassification"]>["category"] | "fixture_event";
  importance: "high" | "medium" | "low";
  confidenceScore: number;
  signalStage: "early" | "developing" | "confirmed";
  whyItMatters: string;
  whatToWatch: string;
}

export interface NewsSummaryItem {
  id: string;
  headlineSummary: string;
  whyItMatters: string;
  watchItem: string;
  implicationTag:
    | "Policy risk"
    | "Geopolitical escalation"
    | "Election odds relevance"
    | "Regulatory pressure"
    | "Defense / energy implication"
    | "Narrative shift"
    | "Watchlist item";
  importance: "High" | "Medium" | "Low";
  status: "Early" | "Breaking" | "Developing" | "Confirmed";
  confidenceScore: number;
  sourceCount: number;
  sources: CoverageSource[];
}

export interface NarrativeTrend {
  id: string;
  title: string;
  category: EventCluster["category"];
  latestAt: string;
  sourceCount: number;
  clusterCount: number;
  velocityScore: number;
  label: "forming" | "accelerating" | "confirmed";
  interpretation: string;
}

export interface Signal {
  id: string;
  family: SignalFamilyKey;
  type: string;
  subtype: string;
  direction: SignalDirection;
  magnitude: number;
  confidence: number;
  occurredAt: string;
  sourceId: string;
  sourceEventId: string;
  rationale: string;
  derivedFeatures: Record<string, number | string | boolean>;
  rawPayload: Record<string, unknown>;
  extractionMethod: string;
  status: SignalStatus;
  decayHalfLifeHours: number;
  correlationKey?: string;
}

export interface StatementClassification {
  label:
    | "qualifies_yes_high"
    | "qualifies_yes_ambiguous"
    | "deescalation_but_not_resolution"
    | "not_qualifying"
    | "escalatory";
  deescalationScore: number;
  announcementScore: number;
  qualifiesYesProbability: number;
  rationale: string[];
  extractedPhrases: string[];
  ambiguityFlags: string[];
  officialnessScore: number;
}

export interface DriverContribution {
  signalId: string;
  family: SignalFamilyKey;
  title: string;
  affects: Array<"real_end" | "formal_announcement" | "resolution_friction">;
  pointsDelta: number;
  confidence: number;
  stale: boolean;
  correlatedPenaltyApplied: number;
  contradictionPenaltyApplied: number;
  narrative: string;
  sourceId?: string;
  signalTimestamp?: string;
}

export interface HistoricalPatternMatch {
  campaignId: string;
  campaignLabel: string;
  actionType: ActionType;
  similarity: number;
  rationale: string;
  doctrineNotes: string[];
}

export interface ActionTypeProbability {
  actionType: ActionType;
  probability: number;
  direction: "raises_real_end" | "lowers_real_end" | "mixed";
  historicalAnalogs: HistoricalPatternMatch[];
  supportingVariables: string[];
  contradictingVariables: string[];
  confidence: number;
  doctrineNotes: string[];
}

export interface OperationalPhaseScore {
  actionType: ActionType;
  currentProbability: number;
  transitionProbability: number;
  horizonTerminationProbability: number;
}

export interface ARIMAXFeatureVector {
  tankerSortieTempo: number;
  airBridgeDensity: number;
  isrPersistence: number;
  militaryCargoArrivals: number;
  refuelingTrackPersistence: number;
  strikePackageTempo: number;
  tankerCorridorDensity: number;
  rerouteSlowdownAnomaly: number;
  supportVesselDensity: number;
  convoyEscortCoMovement: number;
  aisDarkActivity: number;
  portCallIrregularity: number;
  officialMeetings: number;
  mediatorActivity: number;
  ceasefireReferences: number;
  explicitEndLanguage: number;
  institutionalAlignment: number;
  strikeEventCount: number;
  crossBorderStrikeIndicator: number;
  forceMovementScore: number;
  weaponsDeploymentIndicator: number;
  retaliationThreatLanguage: number;
  daysSinceMajorStrike: number;
  daysToDeadline: number;
  oilStress: number;
  marketProbability: number;
  regionalSpilloverIndex: number;
  seasonality: number;
}

export interface HistoricalCampaignPhase {
  phaseId: string;
  label: string;
  actionType: ActionType;
  cadence: "weekly" | "monthly";
  dateStart: string;
  dateEnd: string;
  politicalTrigger: string;
  forceBuildupIndicators: string[];
  strikeInitiationIndicators: string[];
  sustainmentIndicators: string[];
  settlementSignals: string[];
  terminationLanguageTiming: string;
  logisticsDrawdownSignals: string[];
  retrogradeSignals: string[];
  residualOverwatchSignals: string[];
}

export interface HistoricalCampaignPattern {
  id: string;
  label: string;
  theater: string;
  periodLabel: string;
  doctrineNotes: string[];
  phases: HistoricalCampaignPhase[];
}

export interface HistoricalPatternAdjustment {
  realEndDelta: number;
  formalAnnouncementDelta: number;
  frictionDelta: number;
  confidenceDelta: number;
  notes: string[];
}

export interface HistoricalPatternAssessment {
  generatedAt: string;
  featureVector: ARIMAXFeatureVector;
  actionTypeProbabilities: ActionTypeProbability[];
  operationalPhaseScores: OperationalPhaseScore[];
  historicalCampaigns: HistoricalCampaignPattern[];
  adjustment: HistoricalPatternAdjustment;
  confidence: number;
  summary: string;
}

export interface BeliefState {
  asOf: string;
  profileKey: WeightProfileKey;
  trueDeescalationProbability: number;
  formalAnnouncementProbability: number;
  conditionalAnnouncementGivenEndProbability: number;
  dateBucketProbabilities: Record<MarketId, number>;
  marginalBucketProbabilities: Record<MarketId, number>;
  yesProbabilityByContract: Record<MarketId, number>;
  noProbabilityByContract: Record<MarketId, number>;
  decompositionByContract: Record<
    MarketId,
    {
      realEndByDate: number;
      announcementGivenEnd: number;
      frictionMultiplier: number;
      yesProbability: number;
    }
  >;
  dailyAnnouncementHazard: number;
  dailyRealDeescalationHazard: number;
  resolutionFrictionScore: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  modelNotes: string[];
  wordingRiskScore: number;
  marketDislocationScore: number;
  historicalActionTypeProbabilities?: ActionTypeProbability[];
  historicalPatternSummary?: string;
  topPositiveDrivers: DriverContribution[];
  topNegativeDrivers: DriverContribution[];
  staleSignals: DriverContribution[];
}

export interface WeightProfile {
  key: WeightProfileKey;
  label: string;
  description: string;
  familyWeights: Record<SignalFamilyKey, number>;
  confidenceMultiplier: number;
  recencyHalfLifeHours: number;
  contradictionPenalty: number;
  correlationPenalty: number;
  resolutionFrictionWeight: number;
}

export interface ScenarioEventInput {
  title: string;
  family: SignalFamilyKey;
  magnitude: number;
  confidence: number;
  rationale: string;
  occurredAt: string;
  derivedFeatures?: Record<string, number | string | boolean>;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  events: ScenarioEventInput[];
}

export interface MarketSnapshot {
  marketId: MarketId;
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volatility: number;
}

export interface MarketHistoryPoint {
  marketId: MarketId;
  timestamp: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  spread?: number;
  sourceLabel?: string;
  note?: string;
}

export interface CandidateImpact {
  signalId: string;
  subtype: string;
  family: SignalFamilyKey;
  confidence: number;
  rationale: string;
  projectedBelief: BeliefState;
  deltaTrueDeescalationProbability: number;
  deltaFormalAnnouncementProbability: number;
  deltaConditionalAnnouncementGivenEndProbability: number;
  deltaResolutionFrictionScore: number;
  deltaConfidenceScore: number;
  deltaYesProbabilityByContract: Record<MarketId, number>;
  biggestAffectedBucket: MarketId;
  biggestAffectedBucketDelta: number;
  primaryAffectedPath: "real_end" | "formal_announcement" | "both";
  explanation: string;
  uncertaintyCaveat?: string;
}

export interface TradeDecisionComponents {
  gapSize: number;
  confidence: number;
  catalystNearness: number;
  liquidityQuality: number;
  wordingRiskPenalty: number;
}

export interface TradeDecision {
  marketId: MarketId;
  tradeScore: number;
  stance: "LONG_YES" | "LONG_NO" | "WATCH" | "NO_TRADE";
  rationale: string[];
  invalidation: string[];
  warnings: string[];
  components: TradeDecisionComponents;
  edgeDirection: "yes" | "no" | "none";
}

export interface ThesisCard {
  marketId: MarketId;
  bullishCatalyst: string;
  bearishCatalyst: string;
  wordingCatalyst: string;
  invalidation: string;
  provisional: boolean;
}

export interface CrossBucketDislocation {
  nearMarketId: MarketId;
  farMarketId: MarketId;
  marketCurveMove: number;
  modelCurveMove: number;
  curveDislocation: number;
  steepnessDelta: number;
  interpretation: string;
  strongest: boolean;
}

export interface CatalystEvent {
  id: string;
  title: string;
  startAt: string;
  eventType:
    | "press_briefing"
    | "speech"
    | "diplomatic_meeting"
    | "deadline"
    | "weekend_window"
    | "thin_liquidity_window";
  confidence: "confirmed" | "inferred";
  relevance: "high" | "medium";
  linkedMarkets: MarketId[];
  note: string;
  sourceLabel: string;
  fixtureBacked: boolean;
}

export interface SignalFamilyMetrics {
  family: SignalFamilyKey;
  totalFirings: number;
  usefulMoveRate: number;
  averagePostSignalMove: number;
  resolutionAlignmentRate: number;
  sourceLabels: string[];
  evidenceNote: string;
  hitRateByHorizon: {
    short: number;
    medium: number;
  };
  sampleSizeWarning?: string;
}

export interface OperationIndicator {
  id: string;
  label: string;
  value: number;
  direction: "raises_operation_probability" | "lowers_operation_probability" | "ambiguous";
  evidence: string;
  sourceLabels: string[];
  caveat: string;
}

export interface PositionSizingGuidance {
  marketId: MarketId;
  tier: "FULL" | "HALF" | "SMALL" | "AVOID";
  rationale: string[];
  disclaimer: string;
}

export interface ExpectedValueEstimate {
  marketId: MarketId;
  evPerUnit: number;
  riskAdjustment: number;
  payoutMultiple: number;
  rank: number;
  interpretation: string;
}

export interface BacktestTradeRecord {
  id: string;
  marketId: MarketId;
  enteredAt: string;
  predictedProbability: number;
  marketProbabilityAtEntry: number;
  realizedOutcome: "YES" | "NO" | "UNRESOLVED_SIMULATED";
  pnlProxy: number;
  tradeScore: number;
  scoreBucket: "no_edge" | "weak_edge" | "tradable" | "high_conviction";
  signalFamilies: SignalFamilyKey[];
  simulated: boolean;
}

export interface CalibrationSummary {
  dataQuality: "fixture_simulated" | "partial_history" | "real_history";
  calibrationCurve: Array<{
    bucket: string;
    averagePredicted: number;
    realizedRate: number;
    count: number;
  }>;
  averageEdgePerTrade: number;
  hitRateByScoreBucket: Record<BacktestTradeRecord["scoreBucket"], number>;
  hitRateBySignalFamily: Array<{
    family: SignalFamilyKey;
    hitRate: number;
    count: number;
  }>;
  trades: BacktestTradeRecord[];
  limitations: string[];
}

export interface ExecutionRuleOutput {
  marketId: MarketId;
  enter: boolean;
  exit: boolean;
  stale: boolean;
  holdingTimeHours: number;
  rules: string[];
}

export interface PortfolioSummary {
  activeTrades: Array<{
    marketId: MarketId;
    stance: TradeDecision["stance"];
    notionalRiskUnit: number;
    theme: "Iran";
    openedAt: string;
  }>;
  exposureByTheme: Array<{ theme: "Iran"; exposure: number }>;
  correlationProxy: number;
  totalRisk: number;
  concentrationWarnings: string[];
}

export interface RegimeState {
  label: "high_volatility" | "low_liquidity" | "pre_event" | "post_event" | "headline_driven" | "balanced";
  confidenceAdjustment: number;
  thresholdAdjustment: number;
  sizingAdjustment: number;
  rationale: string[];
}

export interface WordingRiskAssessment {
  score: number;
  flags: string[];
  downgrade: number;
  precedentNote: string;
}

export interface ReplayHistoryEntry {
  asOf: string;
  belief: BeliefState;
  marketByContract: Record<MarketId, number | null>;
  gapByContract: Record<MarketId, number | null>;
  activeSignals: Signal[];
  sourceEvents: SourceEvent[];
  explanation: string[];
}

export interface ReplayPayload {
  generatedAt: string;
  history: ReplayHistoryEntry[];
  marketHistory: MarketHistoryPoint[];
  marketDataSource?: "live" | "cache" | "fixture" | "proof_history";
  newsEvaluationLedger?: Array<{
    id: string;
    day: string;
    occurredAt: string;
    sourceId: string;
    headline: string;
    category: NonNullable<SourceEvent["liveClassification"]>["category"] | "fixture_event";
    readStatus: "read";
    modelUpdated: boolean;
    strongestBucket: MarketId;
    beforeYes: number;
    afterYes: number;
    delta: number;
    note: string;
  }>;
  eventAnnotations: Array<{
    id: string;
    timestamp: string;
    title: string;
    family: SignalFamilyKey | "source_event";
    note: string;
  }>;
}

export interface DashboardPayload {
  generatedAt: string;
  markets: MarketDefinition[];
  currentBelief: BeliefState;
  marketSnapshots: MarketSnapshot[];
  marketHistory: MarketHistoryPoint[];
  marketDataSource?: "live" | "cache" | "fixture" | "proof_history";
  healthSummary?: TimelinePayload["healthSummary"];
  sourceCoverage?: TimelinePayload["sourceCoverage"];
  newModel?: {
    evidence: GeopoliticalEvidenceItem[];
    features: GeopoliticalFeature[];
    hypotheses: GeopoliticalHypothesisNode[];
    scenarios: GeopoliticalScenario[];
    marketLinks: GeopoliticalMarketLink[];
    tradeDecisions: GeopoliticalTradeDecision[];
    hypothesisConfidence: number;
    contradictionPenalty: number;
    liveEvidenceCount: number;
    signalEvidenceCount: number;
    fixtureEvidenceCount: number;
    lastLiveEvidenceAt?: string;
    dominantFrame?: string;
    marketAlignment?: Array<{
      marketId: MarketId;
      marketLabel: string;
      modelYes: number;
      marketYes: number;
      gap: number;
    }>;
    narrative: {
      summary: string;
      top_changes: string[];
      strongest_supporting_evidence: string[];
      strongest_opposing_evidence: string[];
      what_would_falsify: string[];
    };
  };
  opportunities?: Array<{
    marketId: MarketId;
    label: string;
    gap: number;
    actionabilityScore: number;
    rationale: string;
    caution: string;
  }>;
  alerts?: Array<{
    id: string;
    severity: "high" | "medium";
    title: string;
    body: string;
    occurredAt?: string;
    source: string;
    impactPath: "real_end" | "formal_announcement" | "both";
  }>;
  decisions: TradeDecision[];
  theses: ThesisCard[];
  crossBucketDislocations: CrossBucketDislocation[];
  catalystCalendar: CatalystEvent[];
  signalFamilyMetrics: SignalFamilyMetrics[];
  operationIndicators: OperationIndicator[];
  sizingGuidance: PositionSizingGuidance[];
  expectedValueRanking: ExpectedValueEstimate[];
  calibrationSummary: CalibrationSummary;
  executionRules: ExecutionRuleOutput[];
  portfolioSummary: PortfolioSummary;
  regimeState: RegimeState;
  wordingRiskAssessment: WordingRiskAssessment;
  historicalPatternEngine?: HistoricalPatternAssessment;
  latestSignals: Signal[];
  candidateSignals: Signal[];
  candidateImpacts: CandidateImpact[];
  sourceEvents: SourceEvent[];
  discrepancy: Array<{
    marketId: MarketId;
    modelYes: number;
    marketYes: number;
    gap: number;
  }>;
  warnings: string[];
  fixtureMode: boolean;
}

export interface SignalsExplorerPayload {
  generatedAt: string;
  fixtureMode: boolean;
  signals: Signal[];
  sourceEvents: SourceEvent[];
  sources: SourceMeta[];
  candidateImpacts: CandidateImpact[];
}

export interface TimelinePayload {
  generatedAt: string;
  fixtureMode: boolean;
  freshness: {
    cacheAgeMs: number;
    refreshIntervalMs: number;
    lastFetchAttemptAt?: string;
    lastSuccessfulFetchAt?: string;
    usingCachedData: boolean;
  };
  healthSummary?: {
    healthySources: number;
    unhealthySources: number;
    dueNowSources: number;
    updatesStored: number;
    lastModelRefreshAt?: string;
  };
  events: SourceEvent[];
  clusters: EventCluster[];
  newsSummary: NewsSummaryItem[];
  narrativeTrends: NarrativeTrend[];
  catalystFeed?: Array<{
    id: string;
    title: string;
    occurredAt: string;
    sourceId: string;
    category: NonNullable<SourceEvent["liveClassification"]>["category"];
    relevanceScore: number;
    impactPath: "real_end" | "formal_announcement" | "both";
    rationale: string;
  }>;
  sourceCoverage: Array<{
    key: string;
    label: string;
    category: "newspaper" | "think_tank" | "broadcaster" | "live_blog" | "official";
    status: "live" | "fallback" | "error" | "stale";
    latestAt?: string;
    note: string;
    url?: string;
    adapter: "rss" | "page";
    lastFetchAttemptAt?: string;
    lastSuccessfulFetchAt?: string;
    cacheAgeMs?: number;
    refreshIntervalMs?: number;
    relevantItems?: number;
    itemsConsidered?: number;
  }>;
}
