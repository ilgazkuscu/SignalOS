import type { ReplayPayload, SignalFamilyKey, SourceEvent } from "@/lib/types/domain";
import { compareIsoAsc } from "@/lib/utils/sort";

type ReplayAnnotation = ReplayPayload["eventAnnotations"][number];

const MAJOR_EVENT_PATTERNS: Array<{
  pattern: RegExp;
  note: string;
  minScore?: number;
}> = [
  { pattern: /operations concluded|operation has ended|mission complete|explicit end|formal end|end of operation/i, note: "Explicit resolution wording." },
  { pattern: /vance|vice president|envoy|delegation/i, note: "Senior-level diplomatic movement." },
  { pattern: /visit(?:ed|s|ing)?|trip|travel|summit|meeting|talks|ceasefire|negotiat|muscat|islamabad|pakistan/i, note: "Diplomatic channel or leader-travel signal." },
  { pattern: /carrier|sortie|tanker|bomber|troop|military buildup|deployment/i, note: "Force-posture shift." },
  { pattern: /proxy|militia|rocket|missile|strike|retaliat|houthi/i, note: "Escalation or retaliation signal." },
];

function majorEventScore(event: SourceEvent) {
  const text = `${event.title} ${event.body} ${event.tags.join(" ")} ${event.rawPayload.articleExcerpt ?? ""} ${event.rawPayload.keyQuote ?? ""}`.toLowerCase();
  const classification = event.liveClassification;

  let score = classification?.relevanceScore ?? Math.min(0.55, event.confidence);

  if (classification?.category === "resolution_wording") score += 0.3;
  if (classification?.category === "proxy_escalation") score += 0.26;
  if (classification?.category === "force_posture") score += 0.24;
  if (classification?.category === "diplomatic_channel") score += 0.22;
  if (classification?.inferredFamily === "leaderSchedule") score += 0.18;

  for (const matcher of MAJOR_EVENT_PATTERNS) {
    if (matcher.pattern.test(text)) {
      score += matcher.minScore ?? 0.14;
    }
  }

  return score;
}

function inferAnnotationNote(event: SourceEvent) {
  const text = `${event.title} ${event.body} ${event.tags.join(" ")}`.toLowerCase();
  const matched = MAJOR_EVENT_PATTERNS.find((matcher) => matcher.pattern.test(text));
  return matched?.note ?? event.liveClassification?.rationale ?? event.body;
}

export function isMajorEvent(event: SourceEvent, threshold = 0.72) {
  return majorEventScore(event) >= threshold;
}

export function buildMajorEventAnnotations(events: SourceEvent[], rangeEnd?: Date): ReplayAnnotation[] {
  return events
    .filter((event) => !rangeEnd || new Date(event.occurredAt).getTime() <= rangeEnd.getTime())
    .filter((event) => isMajorEvent(event))
    .map((event) => ({
      id: event.id,
      timestamp: event.occurredAt,
      title: event.title,
      family: (event.liveClassification?.inferredFamily ?? "source_event") as SignalFamilyKey | "source_event",
      note: inferAnnotationNote(event),
    }))
    .sort((left, right) => compareIsoAsc(left.timestamp, right.timestamp))
    .slice(-16);
}
