import type { CoverageSource, EventCluster, NarrativeTrend, NewsSummaryItem, SourceEvent } from "@/lib/types/domain";
import { sourceDomain, sourceEventUrl } from "./source-url";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|and|of|to|in|on|for|with|says|said|report|reports)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clusterKey(event: SourceEvent) {
  const classification = event.liveClassification?.category ?? "fixture_event";
  const normalizedTitle = normalize(event.title)
    .split(" ")
    .filter((token) => token.length > 3)
    .slice(0, 7)
    .join("-");
  const hourWindow = new Date(event.occurredAt).toISOString().slice(0, 13);
  return `${classification}:${normalizedTitle}:${hourWindow}`;
}

function importanceFor(event: SourceEvent): EventCluster["importance"] {
  const score = event.liveClassification?.relevanceScore ?? event.confidence;
  if (score >= 0.78 || /explicit|concluded|strike|retaliat/i.test(`${event.title} ${event.body}`)) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

function whyItMatters(event: SourceEvent) {
  const category = event.liveClassification?.category;
  if (category === "resolution_wording") return "Resolution wording can directly change whether the contract settles YES, not just whether de-escalation is real.";
  if (category === "proxy_escalation") return "Proxy escalation can invalidate a de-escalation thesis and reprice short-dated buckets quickly.";
  if (category === "diplomatic_channel") return "Diplomatic movement affects timing and whether a face-saving off-ramp is plausible.";
  if (category === "force_posture") return "Force posture is hard evidence for the real-world state, but still needs wording to settle the market.";
  return "This item is relevant context but needs corroboration or a clearer market linkage.";
}

function whatToWatch(event: SourceEvent) {
  const category = event.liveClassification?.category;
  if (category === "resolution_wording") return "Watch for official follow-up using 'concluded', 'ended', or 'no longer conducting operations'.";
  if (category === "proxy_escalation") return "Watch for U.S. casualty reports, response threats, or resumed strike packages.";
  if (category === "diplomatic_channel") return "Watch whether talks produce official language rather than anonymous optimism.";
  if (category === "force_posture") return "Watch whether posture changes are confirmed by official statements or sustained rotations.";
  return "Watch whether this becomes cross-source confirmed or stays as ambient context.";
}

function sourcePriority(event: SourceEvent) {
  if (event.sourceId === "nyt" || event.sourceId === "wsj" || event.sourceId === "bbc" || event.sourceId === "ft") return 0.18;
  if (event.liveClassification?.category === "strategic_analysis") return -0.08;
  return 0;
}

function recencyWeight(occurredAt: string, now = new Date()) {
  const ageHours = Math.max(0, (now.getTime() - new Date(occurredAt).getTime()) / 3_600_000);
  if (ageHours <= 6) return 0.34;
  if (ageHours <= 24) return 0.22;
  if (ageHours <= 72) return 0.1;
  return -0.04;
}

function clusterSortScore(cluster: EventCluster, now = new Date()) {
  const categoryBonus =
    cluster.category === "resolution_wording" ? 0.2 :
    cluster.category === "proxy_escalation" ? 0.16 :
    cluster.category === "diplomatic_channel" ? 0.12 :
    cluster.category === "force_posture" ? 0.1 :
    cluster.category === "ambient_news" ? -0.18 :
    cluster.category === "strategic_analysis" ? -0.02 :
    0;

  const leadSourceBonus = cluster.sources.length
    ? sourcePriority({
        id: cluster.sources[0].id,
        sourceId: cluster.sources[0].sourceId,
        title: cluster.sources[0].headline,
        body: "",
        occurredAt: cluster.occurredAt,
        status: "verified",
        confidence: cluster.confidenceScore,
        extractionMethod: "cluster_sort",
        rawPayload: {},
        tags: [],
        liveClassification: cluster.category === "fixture_event" ? undefined : {
          category: cluster.category,
          impacts: ["real_end"],
          relevanceScore: cluster.confidenceScore,
          rationale: cluster.summary,
        },
      } as SourceEvent)
    : 0;

  return cluster.confidenceScore * 0.45 + recencyWeight(cluster.occurredAt, now) + categoryBonus + leadSourceBonus + Math.min(cluster.sourceCount, 4) * 0.04;
}

export function clusterSourceEvents(events: SourceEvent[]): EventCluster[] {
  const clusters = new Map<string, SourceEvent[]>();
  for (const event of events) {
    const key = clusterKey(event);
    clusters.set(key, [...(clusters.get(key) ?? []), event]);
  }

  return Array.from(clusters.entries())
    .map(([id, clusteredEvents]) => {
      const sorted = clusteredEvents.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const lead = sorted[0];
      const sources = dedupeSources(sorted);
      return {
        id,
        canonicalTitle: lead.title,
        summary: lead.body,
        occurredAt: lead.occurredAt,
        sourceCount: sources.length,
        sources,
        category: lead.liveClassification?.category ?? "fixture_event",
        importance: importanceFor(lead),
        confidenceScore: confidenceForCluster(sorted, sources.length),
        signalStage: signalStageFor(sorted, sources.length),
        whyItMatters: whyItMatters(lead),
        whatToWatch: whatToWatch(lead),
      } satisfies EventCluster;
    })
    .sort((a, b) => {
      const scoreDelta = clusterSortScore(b) - clusterSortScore(a);
      if (Math.abs(scoreDelta) > 0.025) return scoreDelta;
      const importanceDelta = importanceWeight(b.importance) - importanceWeight(a.importance);
      if (importanceDelta !== 0) return importanceDelta;
      if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
      return b.occurredAt.localeCompare(a.occurredAt);
    });
}

function dedupeSources(events: SourceEvent[]): CoverageSource[] {
  const byKey = new Map<string, CoverageSource>();
  for (const event of events) {
    const url = sourceEventUrl(event);
    const key = `${event.sourceId}:${sourceDomain(url)}:${normalize(event.title).slice(0, 80)}`;
    byKey.set(key, {
      id: `${event.id}-coverage`,
      sourceId: event.sourceId,
      sourceName: event.sourceId.replaceAll("-", " "),
      headline: event.title,
      url,
      occurredAt: event.occurredAt,
      relevanceTag: event.liveClassification?.category?.replaceAll("_", " "),
      confidence: event.confidence,
    });
  }
  return Array.from(byKey.values()).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function importanceWeight(value: EventCluster["importance"]) {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  return 1;
}

export function buildNewsSummary(clusters: EventCluster[]): NewsSummaryItem[] {
  return clusters.slice(0, 7).map((cluster) => ({
    id: `summary-${cluster.id}`,
    headlineSummary: cluster.canonicalTitle,
    whyItMatters: cluster.whyItMatters,
    watchItem: cluster.whatToWatch,
    implicationTag: implicationFor(cluster.category),
    importance: cluster.importance === "high" ? "High" : cluster.importance === "medium" ? "Medium" : "Low",
    status: summaryStatusFor(cluster),
    confidenceScore: cluster.confidenceScore,
    sourceCount: cluster.sourceCount,
    sources: cluster.sources,
  }));
}

export function buildNarrativeTrends(clusters: EventCluster[], now: Date = new Date()): NarrativeTrend[] {
  const byCategory = new Map<EventCluster["category"], EventCluster[]>();
  for (const cluster of clusters) {
    byCategory.set(cluster.category, [...(byCategory.get(cluster.category) ?? []), cluster]);
  }

  return Array.from(byCategory.entries())
    .map(([category, categoryClusters]) => {
      const sorted = categoryClusters.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      const latest = sorted[0];
      const sourceCount = new Set(sorted.flatMap((cluster) => cluster.sources.map((source) => source.sourceId))).size;
      const recency = Math.max(0, 1 - (now.getTime() - new Date(latest.occurredAt).getTime()) / (72 * 60 * 60 * 1000));
      const velocityScore = clamp(
        sorted.length * 0.18 + sourceCount * 0.12 + sorted.reduce((sum, cluster) => sum + cluster.confidenceScore, 0) / Math.max(sorted.length, 1) * 0.35 + recency * 0.35,
        0,
        1,
      );
      const label: NarrativeTrend["label"] = sourceCount >= 3 || sorted.some((cluster) => cluster.signalStage === "confirmed")
        ? "confirmed"
        : velocityScore >= 0.58
          ? "accelerating"
          : "forming";

      return {
        id: `narrative-${category}`,
        title: narrativeTitleFor(category),
        category,
        latestAt: latest.occurredAt,
        sourceCount,
        clusterCount: sorted.length,
        velocityScore,
        label,
        interpretation: narrativeInterpretationFor(category, label),
      } satisfies NarrativeTrend;
    })
    .sort((left, right) => right.velocityScore - left.velocityScore || right.latestAt.localeCompare(left.latestAt))
    .slice(0, 6);
}

function implicationFor(category: EventCluster["category"]): NewsSummaryItem["implicationTag"] {
  if (category === "resolution_wording") return "Narrative shift";
  if (category === "proxy_escalation") return "Geopolitical escalation";
  if (category === "force_posture") return "Defense / energy implication";
  if (category === "diplomatic_channel") return "Policy risk";
  if (category === "strategic_analysis") return "Watchlist item";
  return "Watchlist item";
}

function confidenceForCluster(events: SourceEvent[], sourceCount: number) {
  const avgConfidence = events.reduce((sum, event) => sum + event.confidence, 0) / Math.max(events.length, 1);
  const crossSourceAgreement = clamp(sourceCount / 4, 0, 1);
  const maxRelevance = Math.max(...events.map((event) => event.liveClassification?.relevanceScore ?? 0.45));
  const novelty = sourceCount <= 2 && maxRelevance >= 0.72 ? 0.85 : 0.55;

  return clamp(avgConfidence * 0.34 + crossSourceAgreement * 0.3 + maxRelevance * 0.24 + novelty * 0.12, 0, 1);
}

function signalStageFor(events: SourceEvent[], sourceCount: number): EventCluster["signalStage"] {
  const maxRelevance = Math.max(...events.map((event) => event.liveClassification?.relevanceScore ?? 0));
  if (sourceCount >= 3 || events.length >= 4) return "confirmed";
  if (sourceCount >= 2 || maxRelevance >= 0.78) return "developing";
  return "early";
}

function summaryStatusFor(cluster: EventCluster): NewsSummaryItem["status"] {
  if (cluster.signalStage === "confirmed") return "Confirmed";
  if (cluster.signalStage === "developing") return "Developing";
  if (cluster.importance === "high") return "Breaking";
  return "Early";
}

function narrativeTitleFor(category: EventCluster["category"]) {
  if (category === "resolution_wording") return "Resolution wording";
  if (category === "proxy_escalation") return "Regional escalation risk";
  if (category === "force_posture") return "Force posture normalization";
  if (category === "diplomatic_channel") return "Diplomatic off-ramp";
  if (category === "strategic_analysis") return "Strategic-analysis consensus";
  return "Ambient Iran narrative";
}

function narrativeInterpretationFor(category: EventCluster["category"], label: NarrativeTrend["label"]) {
  const prefix = label === "confirmed" ? "Cross-source confirmation is building" : label === "accelerating" ? "The narrative is gaining speed" : "This is still an early narrative";
  if (category === "resolution_wording") return `${prefix}; watch whether official language becomes market-qualifying rather than merely optimistic.`;
  if (category === "proxy_escalation") return `${prefix}; watch for casualty reports or retaliation language that could invalidate de-escalation.`;
  if (category === "diplomatic_channel") return `${prefix}; watch whether talks translate into explicit official wording.`;
  if (category === "force_posture") return `${prefix}; watch whether hard OSINT posture changes are confirmed by public statements.`;
  return `${prefix}; treat it as context until it links clearly to a contract-resolution path.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
