import type { OperationIndicator, Signal, SourceEvent } from "@/lib/types/domain";

const indicatorRules = [
  {
    id: "rank-mix-pressure",
    label: "Officer / senior-NCO concentration",
    keywords: ["general", "admiral", "colonel", "commander", "senior officer", "joint task force", "command element"],
    caveat: "A senior-heavy footprint can indicate planning or liaison work, but it can also reflect routine visits or exercises.",
  },
  {
    id: "tanker-bridge",
    label: "Tanker bridge / aerial refueling tempo",
    keywords: ["tanker", "kc-46", "kc-135", "gold", "pack", "reach", "aerial refueling"],
    caveat: "Tanker movement is high-signal only when abnormal against exercise and rotation baselines.",
  },
  {
    id: "carrier-posture",
    label: "Carrier / amphibious readiness posture",
    keywords: ["carrier", "csg", "strike group", "amphibious", "marine expeditionary", "arg"],
    caveat: "Presence alone is not enough; watch replacement cycles and whether groups linger past normal rotations.",
  },
  {
    id: "dependent-departure",
    label: "Dependent departure / embassy posture",
    keywords: ["ordered departure", "authorized departure", "dependents", "embassy", "nonessential personnel"],
    caveat: "Departure orders can reflect precautionary risk management rather than imminent kinetic action.",
  },
  {
    id: "isr-tempo",
    label: "ISR orbit / surveillance tempo",
    keywords: ["rc-135", "rivvet", "rivet", "u-2", "rq-4", "global hawk", "p-8", "isr", "surveillance"],
    caveat: "ISR tempo often rises before operations, but it also rises during deterrence and crisis monitoring.",
  },
  {
    id: "strategic-command-aircraft",
    label: "Strategic command-aircraft movement",
    keywords: ["e-4b", "e-6b", "nightwatch", "mercury", "command aircraft", "national command"],
    caveat: "Command-aircraft movement is noisy; treat it as a timing alert, not standalone proof.",
  },
  {
    id: "munitions-logistics",
    label: "Munitions / logistics surge",
    keywords: ["munitions", "patriot", "thaad", "jassm", "sm-6", "sealift", "prepositioning", "logistics"],
    caveat: "Logistics can signal preparation, replenishment, or deterrence. Direction depends on context.",
  },
];

export function buildOperationIndicators({
  signals,
  sourceEvents,
}: {
  signals: Signal[];
  sourceEvents: SourceEvent[];
}): OperationIndicator[] {
  const evidenceText = [
    ...signals.map((signal) => ({
      text: `${signal.family} ${signal.subtype} ${signal.rationale} ${JSON.stringify(signal.rawPayload)}`,
      sourceId: signal.sourceId,
      confidence: signal.confidence,
    })),
    ...sourceEvents.map((event) => ({
      text: `${event.title} ${event.body} ${event.tags.join(" ")} ${JSON.stringify(event.rawPayload)}`,
      sourceId: event.sourceId,
      confidence: event.confidence,
    })),
  ];

  return indicatorRules
    .map((rule) => {
      const matches = evidenceText.filter((item) => rule.keywords.some((keyword) => item.text.toLowerCase().includes(keyword)));
      const sourceLabels = Array.from(new Set(matches.map((match) => match.sourceId))).slice(0, 5);
      const keywordHits = new Set(
        matches.flatMap((match) => rule.keywords.filter((keyword) => match.text.toLowerCase().includes(keyword))),
      ).size;
      const confidenceMass = matches.reduce((sum, match) => sum + match.confidence, 0);
      const value = clamp(keywordHits * 0.12 + sourceLabels.length * 0.12 + confidenceMass * 0.05, 0, 1);

      return {
        id: rule.id,
        label: rule.label,
        value,
        direction: value >= 0.55 ? "raises_operation_probability" : value <= 0.12 ? "lowers_operation_probability" : "ambiguous",
        evidence: matches.length
          ? `${matches.length} matching observation${matches.length === 1 ? "" : "s"} across ${sourceLabels.length} source${sourceLabels.length === 1 ? "" : "s"}.`
          : "No current matching observations in the fixture/live signal set.",
        sourceLabels,
        caveat: rule.caveat,
      } satisfies OperationIndicator;
    })
    .sort((left, right) => right.value - left.value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
