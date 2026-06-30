import type { StatementClassification } from "@/lib/types/domain";
import { clamp } from "@/lib/utils/math";

interface StatementInput {
  text: string;
  sourceType: string;
  speaker?: string;
  officialness: number;
  mediaFormat: "text" | "video" | "transcript";
}

const explicitEndPatterns = [
  /operations (against iran )?have concluded/i,
  /operations (against iran )?have ended/i,
  /military operations .* concluded/i,
  /we are no longer conducting military operations/i,
  /combat operations have ended/i,
  /mission complete/i,
  /offensive operations have concluded/i,
  /the operation has ended/i,
];

const ambiguousPatterns = [
  /pause/i,
  /paused/i,
  /ceasefire/i,
  /halted/i,
  /suspension/i,
  /talks underway/i,
  /remain ready/i,
  /temporary halt/i,
  /pending negotiation/i,
  /while diplomacy proceeds/i,
  /objective achieved/i,
];

const escalatoryPatterns = [
  /additional strikes/i,
  /fire and fury/i,
  /further action/i,
  /retaliate/i,
  /all options remain on the table/i,
];

const deescalatoryPatterns = [
  /peace/i,
  /deal/i,
  /talks/i,
  /objective achieved/i,
  /completed objective/i,
  /diplomatic/i,
  /ceasefire/i,
  /de-escalat/i,
  /off-ramp/i,
];

const unofficialPatterns = [
  /unnamed officials/i,
  /sources said/i,
  /people familiar/i,
  /according to leaks/i,
];

export function classifyStatement(input: StatementInput): StatementClassification {
  const normalized = input.text.trim();
  const lower = normalized.toLowerCase();
  const extractedPhrases = [
    ...explicitEndPatterns.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source),
    ...ambiguousPatterns.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source),
    ...escalatoryPatterns.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source),
  ];

  const hasExplicitEnd = explicitEndPatterns.some((pattern) => pattern.test(normalized));
  const hasAmbiguous = ambiguousPatterns.some((pattern) => pattern.test(normalized));
  const hasEscalatory = escalatoryPatterns.some((pattern) => pattern.test(normalized));
  const hasDeescalatory = deescalatoryPatterns.some((pattern) => pattern.test(normalized));
  const hasUnofficialMarker = unofficialPatterns.some((pattern) => pattern.test(normalized));
  const mentionsIran = /iran/i.test(normalized);
  const mentionsOperations = /operations|operation|combat|military/i.test(normalized);

  let deescalationScore = 0.1;
  let announcementScore = 0.08;
  let qualifiesYesProbability = 0.05;
  const rationale: string[] = [];
  const ambiguityFlags: string[] = [];

  if (hasDeescalatory) {
    deescalationScore += 0.35;
    rationale.push("Detected de-escalatory language indicating reduced conflict intensity.");
  }

  if (hasAmbiguous) {
    deescalationScore += 0.15;
    announcementScore += 0.12;
    qualifiesYesProbability += 0.12;
    rationale.push("Detected pause or ceasefire language, which may indicate de-escalation but is not clearly qualifying.");
    ambiguityFlags.push("Language implies reduced activity but stops short of an explicit end declaration.");
  }

  if (hasExplicitEnd) {
    deescalationScore += 0.4;
    announcementScore += 0.55;
    qualifiesYesProbability += 0.68;
    rationale.push("Detected explicit conclusion language strongly aligned with a qualifying market statement.");
  }

  if (hasEscalatory) {
    deescalationScore -= 0.3;
    announcementScore -= 0.18;
    qualifiesYesProbability -= 0.2;
    rationale.push("Detected escalatory language that undermines the end-of-operations thesis.");
    ambiguityFlags.push("Escalatory language directly conflicts with a clean end-of-operations resolution.");
  }

  if (input.officialness > 0.9 && input.sourceType === "official") {
    announcementScore += 0.12;
    qualifiesYesProbability += 0.12;
    rationale.push("Highly official source boosts the chance that the wording counts for resolution.");
  } else if (input.sourceType === "social" && input.officialness > 0.8) {
    announcementScore += 0.06;
    qualifiesYesProbability += 0.08;
    rationale.push("High-officialness social posting can count, but wording still must be explicit.");
  } else {
    rationale.push("Source is less official, limiting resolution impact even if tone is informative.");
  }

  if (!mentionsIran && !mentionsOperations) {
    qualifiesYesProbability -= 0.02;
    ambiguityFlags.push("Statement does not explicitly mention Iran, which weakens market-resolution fit.");
  }

  if (!mentionsOperations && hasDeescalatory && !hasExplicitEnd) {
    qualifiesYesProbability -= 0.03;
    ambiguityFlags.push("Statement suggests peace or talks without clearly addressing military operations.");
  }

  if (lower.includes("remain ready") || lower.includes("all options remain on the table")) {
    qualifiesYesProbability -= 0.07;
    ambiguityFlags.push("Readiness language suggests operations could resume and weakens qualifying certainty.");
  }

  if (hasAmbiguous && input.sourceType === "official" && input.officialness > 0.9) {
    qualifiesYesProbability += 0.18;
    rationale.push("Ambiguous official wording can still materially affect resolution odds even when it falls short of a clean YES qualifier.");
  }

  if (hasUnofficialMarker) {
    qualifiesYesProbability -= 0.25;
    rationale.push("Unnamed sources do not satisfy the contract's official announcement requirement.");
    ambiguityFlags.push("Source framing appears unofficial or leak-based.");
  }

  if (input.mediaFormat === "video" && input.sourceType === "social" && hasExplicitEnd) {
    qualifiesYesProbability += 0.04;
    rationale.push("Explicit video statement on a qualifying personal channel slightly improves resolution fit.");
  }

  deescalationScore = clamp(deescalationScore);
  announcementScore = clamp(announcementScore);
  qualifiesYesProbability = clamp(qualifiesYesProbability);

  let label: StatementClassification["label"] = "not_qualifying";

  if (hasEscalatory && !hasExplicitEnd) {
    label = "escalatory";
  } else if (qualifiesYesProbability >= 0.75) {
    label = "qualifies_yes_high";
  } else if (qualifiesYesProbability >= 0.35) {
    label = "qualifies_yes_ambiguous";
  } else if (deescalationScore >= 0.45) {
    label = "deescalation_but_not_resolution";
  }

  return {
    label,
    deescalationScore,
    announcementScore,
    qualifiesYesProbability,
    rationale,
    extractedPhrases,
    ambiguityFlags,
    officialnessScore: clamp(input.officialness),
  };
}
