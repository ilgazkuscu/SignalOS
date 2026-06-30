import type { SignalFamilyKey } from "@/lib/types/domain";

export interface PlaybookThreshold {
  condition: string;
  action: string;
  rationale: string;
}

export interface Playbook {
  thesis: string;
  confirmingEvents: string[];
  invalidatingEvents: string[];
  thresholds: PlaybookThreshold[];
  hedges: string[];
}

export interface FamilyBucketConfig {
  id: string;
  label: string;
  weight: number;
  role: string;
  linkedMarketId?: string;
  polymarketSlug?: string;
  opensAt?: string;
  resolvesAt?: string;
  closedAt?: string;
  resolvedOutcome?: "yes" | "no" | null;
}

export interface MarketFamily {
  id: string;
  displayName: string;
  shortThesis: string;
  description: string;
  polymarketEventUrl?: string;
  bucketOrder: FamilyBucketConfig[];
  defaultFamilyId?: string;
  primaryReplayBucketId: string;
  relevantSignalTypes: SignalFamilyKey[];
  signalWeights: Record<string, number>;
  signalBucketInfluence: Record<string, Record<string, number>>;
  news: {
    keywords: string[];
    entities: string[];
    minScore: number;
  };
  playbook: Playbook | null;
}

export interface FamilyBucketRow {
  id: string;
  label: string;
  role: string;
  slug?: string;
  deadlineAt?: string;
  closedAt?: string;
  marketStatus?: "open" | "closed";
  resolvedOutcome?: "yes" | "no" | null;
  outcome: string;
  weight: number;
  modelProbability: number;
  marketProbability: number;
  gap: number;
}

export interface FamilyReplayRow {
  asOf: string;
  label: string;
  modelProbability: number;
  marketProbability: number;
  gap: number;
}

export interface FamilySignalRow {
  id: string;
  signalType: string;
  title: string;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  impactDirection: "positive" | "negative" | "neutral";
  magnitude: number;
  confidence: number;
  weight: number;
  defaultWeight: number;
  adjustedImpact: number;
  rationale: string;
}

export interface FamilyNewsRow {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  relevanceScore: number;
  url?: string;
  processedSignalId?: string;
  status: "processed" | "pending";
}

export interface FamilyEngineOutput {
  familyId: string;
  displayName: string;
  shortThesis: string;
  description: string;
  generatedAt: string;
  aggregateModelProbability: number;
  aggregateMarketProbability: number;
  gap: number;
  horizonLabel: string;
  primaryBucketLabel: string;
  primaryBucketModelProbability: number;
  primaryBucketMarketProbability: number;
  primaryBucketGap: number;
  buckets: FamilyBucketRow[];
  closedBuckets: FamilyBucketRow[];
  replay: FamilyReplayRow[];
  replaySeries?: FamilyReplaySeries;
  signals: FamilySignalRow[];
  signalTimeline: FamilySignalRow[];
  signalMatrix: Array<{
    signalType: string;
    bucketImpacts: Array<{ bucketId: string; value: number }>;
  }>;
  news: FamilyNewsRow[];
  playbook: Playbook | null;
  emptyStates: {
    news?: string;
    playbook?: string;
    replay?: string;
    signals?: string;
  };
}

export interface BucketSnapshot {
  bucketId: string;
  polymarketSlug: string;
  outcome: string;
  status: "not_yet_issued" | "active" | "closed";
  modelProbability: number | null;
  marketPrice: number | null;
  weight: number;
  resolvesAt: string;
  resolvedOutcome?: "yes" | "no" | null;
}

export interface ReplayFrame {
  timestamp: string;
  bucketSnapshots: BucketSnapshot[];
  aggregateModelProbability: number;
  aggregateMarketProbability: number;
  activeCount: number;
  closedCount: number;
  signalsInScope: string[];
  degenerate?: boolean;
}

export interface FamilyReplaySeries {
  familyId: string;
  horizon: { start: string; end: string };
  frames: ReplayFrame[];
  frameInterval: "hourly" | "daily" | "weekly";
  generatedAt: string;
}

export interface FamilySummary {
  familyId: string;
  displayName: string;
  shortThesis: string;
  gap: number;
}
