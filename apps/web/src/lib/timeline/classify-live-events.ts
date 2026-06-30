import { classifyStatement } from "@/lib/classifiers/statement-classifier";
import type { Signal, SignalFamilyKey, SignalDirection, SourceEvent } from "@/lib/types/domain";
import { clamp } from "@/lib/utils/math";

type LiveClassificationCategory = NonNullable<SourceEvent["liveClassification"]>["category"];

function sourceOfficialness(sourceId: string) {
  if (sourceId === "nyt" || sourceId === "wsj" || sourceId === "bbc") return 0.58;
  if (sourceId === "foreign-affairs" || sourceId === "atlantic-council") return 0.66;
  return 0.45;
}

function isLeaderScheduleDisruption(lower: string) {
  return (
    /trump/.test(lower) &&
    /(china|beijing|state visit|visit|trip|travel|summit)/.test(lower) &&
    /(cancel|canceled|cancelled|scrap|scrapped|postpone|postponed|delay|delayed)/.test(lower)
  );
}

function isSeniorDiplomaticVisit(lower: string) {
  return (
    /(vance|vice president|envoy|delegation)/.test(lower) &&
    /(visit|visited|meeting|meets|talks|trip|travel|summit)/.test(lower) &&
    /(pakistan|islamabad|india|new delhi|iran|saudi|uae|qatar|gulf|security|diplom|negotiat|ceasefire)/.test(lower)
  );
}

function buildEventText(event: SourceEvent) {
  const articleExcerpt =
    typeof event.rawPayload.articleExcerpt === "string" ? event.rawPayload.articleExcerpt : "";
  const keyQuote = typeof event.rawPayload.keyQuote === "string" ? event.rawPayload.keyQuote : "";

  return {
    articleExcerpt,
    keyQuote,
    text: `${event.title} ${event.body} ${articleExcerpt} ${keyQuote}`.trim(),
  };
}

export function classifyLiveEvent(event: SourceEvent): SourceEvent {
  const { articleExcerpt, keyQuote, text } = buildEventText(event);
  const lower = text.toLowerCase();
  const statement = classifyStatement({
    text,
    sourceType: "news",
    officialness: sourceOfficialness(event.sourceId),
    mediaFormat: "text",
  });

  let category: LiveClassificationCategory = "ambient_news";
  let impacts: Array<"real_end" | "formal_announcement" | "both"> = ["real_end"];
  let inferredFamily: SignalFamilyKey | undefined;
  let rationale = "Relevant coverage, but not yet decisive enough to alter the core thesis materially.";
  let relevanceScore = 0.3;

  if (statement.qualifiesYesProbability >= 0.55 || /operations concluded|operations ended|mission complete/i.test(text)) {
    category = "resolution_wording";
    impacts = ["formal_announcement", "both"];
    inferredFamily = "resolutionWording";
    relevanceScore = 0.84;
    rationale = "Headline contains wording that could materially change qualification odds or resolution friction.";
  } else if (isSeniorDiplomaticVisit(lower)) {
    category = "diplomatic_channel";
    impacts = ["both"];
    inferredFamily = "diplomaticChannels";
    relevanceScore = 0.78;
    rationale = "Senior-level diplomatic travel or meetings can signal active backchannel positioning and move both de-escalation and announcement timing.";
  } else if (isLeaderScheduleDisruption(lower)) {
    category = "strategic_analysis";
    impacts = ["both"];
    inferredFamily = "leaderSchedule";
    relevanceScore = 0.7;
    rationale = "Leader schedule disruption can signal crisis reprioritization, reducing near-term de-escalation odds and increasing the chance of delayed qualifying language.";
  } else if (/talks|ceasefire|muscat|diplomat|negotiat/i.test(lower)) {
    category = "diplomatic_channel";
    impacts = ["real_end"];
    inferredFamily = "diplomaticChannels";
    relevanceScore = 0.68;
    rationale = "Diplomatic reporting can move true de-escalation odds and the timing path toward a qualifying announcement.";
  } else if (/carrier|sortie|tanker|bomber|military buildup|troop/i.test(lower)) {
    category = "force_posture";
    impacts = ["real_end"];
    inferredFamily = "forcePosture";
    relevanceScore = 0.72;
    rationale = "Force-posture reporting directly informs whether the operation is winding down or re-escalating.";
  } else if (/proxy|militia|houthi|rocket|strike|retaliat/i.test(lower)) {
    category = "proxy_escalation";
    impacts = ["real_end", "both"];
    inferredFamily = "proxyTempo";
    relevanceScore = 0.76;
    rationale = "Proxy escalation reporting can quickly invalidate de-escalation narratives and hit short-dated buckets.";
  } else if (/analysis|strategy|scenario|outlook|policy/i.test(lower) || event.sourceId === "foreign-affairs" || event.sourceId === "atlantic-council") {
    category = "strategic_analysis";
    impacts = ["both"];
    inferredFamily = "manualJudgment";
    relevanceScore = 0.52;
    rationale = "Strategic analysis can sharpen the interpretation of signals, especially around timing and wording incentives.";
  }

  return {
    ...event,
    liveClassification: {
      category,
      impacts,
      inferredFamily,
      relevanceScore,
      rationale,
      excerpt: articleExcerpt || undefined,
      keyQuote: keyQuote || undefined,
    },
  };
}

export function deriveSignalsFromLiveEvents(events: SourceEvent[]): Signal[] {
  return events
    .filter((event) => event.liveClassification && event.liveClassification.relevanceScore >= 0.56)
    .map((event, index) => {
      const classification = event.liveClassification!;
      const { articleExcerpt, keyQuote, text } = buildEventText(event);
      const lower = text.toLowerCase();
      const statement = classifyStatement({
        text,
        sourceType: "news",
        officialness: sourceOfficialness(event.sourceId),
        mediaFormat: "text",
      });
      const conflictPenalty = /(retaliat|escalat|strike|attack|bomber|missile|rocket|militia|proxy)/.test(lower)
        ? 0.18
        : 0;
      const scheduleDisruptionPenalty =
        classification.inferredFamily === "leaderSchedule" &&
        /(cancel|canceled|cancelled|scrap|scrapped|postpone|postponed|delay|delayed)/.test(lower)
          ? 0.2
          : 0;
      const diplomaticBoost =
        classification.category === "diplomatic_channel" || /talks|ceasefire|negotiat|diplomat|off-ramp/i.test(text)
          ? 0.12
          : 0;
      const officialness = sourceOfficialness(event.sourceId);
      const derivedFeatures: Signal["derivedFeatures"] = {
        trueEndSupport: clamp(
          (classification.category === "force_posture"
            ? 0.42
            : classification.category === "proxy_escalation"
              ? 0.16
              : classification.inferredFamily === "leaderSchedule"
                ? 0.28
                : 0.34) +
            statement.deescalationScore * 0.44 +
            diplomaticBoost -
            conflictPenalty -
            scheduleDisruptionPenalty,
        ),
        qualifiesYesProbability: clamp(
          Math.max(
            classification.category === "resolution_wording" ? 0.42 : 0.1,
            statement.qualifiesYesProbability,
          ) -
            scheduleDisruptionPenalty * 0.45 -
            conflictPenalty * 0.25,
        ),
        liveNews: true,
        catalystNearness: clamp(
          classification.relevanceScore * 0.58 +
            statement.announcementScore * 0.18 +
            statement.deescalationScore * 0.16 +
            officialness * 0.08,
        ),
      };
      derivedFeatures.announcementScore = clamp(
        statement.announcementScore +
          classification.relevanceScore * 0.18 +
          (classification.category === "resolution_wording" ? 0.14 : 0) -
          scheduleDisruptionPenalty * 0.2,
      );
      const positive =
        classification.inferredFamily === "leaderSchedule"
          ? !/(cancel|canceled|cancelled|scrap|scrapped|postpone|postponed|delay|delayed)/.test(lower)
          :
        classification.category === "diplomatic_channel" ||
        classification.category === "strategic_analysis" ||
        (classification.category === "resolution_wording" && !/resume|retaliat|escalat|strike/i.test(lower));
      const direction: SignalDirection = positive ? "pro_yes" : "pro_no";
      const magnitudeBase =
        classification.category === "resolution_wording"
          ? 0.28
          : classification.inferredFamily === "leaderSchedule"
            ? 0.22
          : classification.category === "proxy_escalation"
            ? 0.26
            : classification.category === "force_posture"
              ? 0.24
              : classification.category === "diplomatic_channel"
                ? 0.22
                : 0.14;

      return {
        id: `live-signal-${event.id}-${index}`,
        family: classification.inferredFamily ?? "manualJudgment",
        type: "live_news",
        subtype: classification.category,
        direction,
        magnitude: clamp(
          magnitudeBase +
            classification.relevanceScore * 0.16 +
            statement.qualifiesYesProbability * 0.18 +
            statement.deescalationScore * 0.14 -
            conflictPenalty * 0.35,
          0,
          0.85,
        ),
        confidence: clamp(
          0.22 +
            classification.relevanceScore * 0.24 +
            statement.announcementScore * 0.18 +
            officialness * 0.16 -
            statement.ambiguityFlags.length * 0.04,
          0.22,
          0.76,
        ),
        occurredAt: event.occurredAt,
        sourceId: event.sourceId,
        sourceEventId: event.id,
        rationale: classification.rationale,
        derivedFeatures,
        rawPayload: {
          headline: event.title,
          body: event.body,
          articleExcerpt: articleExcerpt || undefined,
          keyQuote: keyQuote || undefined,
          statementLabel: statement.label,
          statementDeescalationScore: statement.deescalationScore,
          statementAnnouncementScore: statement.announcementScore,
          statementQualifiesYesProbability: statement.qualifiesYesProbability,
          statementAmbiguityFlags: statement.ambiguityFlags,
          statementRationale: statement.rationale,
        },
        extractionMethod: "live_headline_classifier",
        status: "verified",
        decayHalfLifeHours:
          classification.category === "resolution_wording"
            ? 30
            : classification.category === "proxy_escalation"
              ? 12
              : classification.inferredFamily === "leaderSchedule"
                ? 16
                : 20,
        correlationKey: `live-${classification.category}-${event.sourceId}`,
      } satisfies Signal;
    });
}
