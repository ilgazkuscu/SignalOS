import type { SourceEvent, WordingRiskAssessment } from "@/lib/types/domain";
import { clamp } from "@/lib/utils/math";

export function assessWordingRisk(sourceEvents: SourceEvent[]): WordingRiskAssessment {
  const text = sourceEvents.map((event) => `${event.title} ${event.body}`).join(" ").toLowerCase();
  const flags: string[] = [];
  let score = 0.22;

  if (/pause|paused|ceasefire|halted|temporary/i.test(text)) {
    score += 0.18;
    flags.push("Ambiguous pause / ceasefire language is present.");
  }
  if (/remain ready|all options remain|resume|retaliat/i.test(text)) {
    score += 0.22;
    flags.push("Readiness or retaliation language can undermine clean resolution.");
  }
  if (/operations against iran have concluded|operations have ended|no longer conducting military operations/i.test(text)) {
    score -= 0.28;
    flags.push("Explicit end-language reduces wording risk.");
  }
  if (!/operations against iran|military operations|combat operations/i.test(text)) {
    score += 0.08;
    flags.push("Relevant text often lacks specific operations-language.");
  }

  score = clamp(score);
  return {
    score,
    flags: flags.length ? flags : ["No major wording-risk flags detected."],
    downgrade: score * 0.35,
    precedentNote: "Resolution-sensitive markets often fail when real de-escalation does not convert into explicit qualifying language.",
  };
}
