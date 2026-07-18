import type { EvidenceItem, Feature } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function sumConfidence(items: EvidenceItem[], matcher: (item: EvidenceItem) => boolean) {
  return items.filter(matcher).reduce((sum, item) => sum + item.confidence, 0);
}

export function computeFeatures(evidenceList: EvidenceItem[]): Feature[] {
  const lower = evidenceList.map((item) => ({
    item,
    text: `${item.headline} ${item.summary}`.toLowerCase(),
  }));
  const totalConfidence = Math.max(
    evidenceList.reduce((sum, item) => sum + item.confidence, 0),
    1,
  );
  const reportedShare = average(
    evidenceList.map((item) =>
      item.factuality_level === "reported" ? 1 : item.factuality_level === "inferred" ? 0.6 : 0.25,
    ),
  );

  const tripDelaySignal = clamp01(
    sumConfidence(
      lower.map(({ item }) => item),
      (item) => /trump|xi|china|beijing|trip|visit|travel|summit/i.test(`${item.headline} ${item.summary}`) &&
        /delay|postpone|cancel|canceled|cancelled|scrap|scrapped/i.test(`${item.headline} ${item.summary}`),
    ) / 2.2,
  );

  const vanceVisibilitySignal = clamp01(
    sumConfidence(
      lower.map(({ item }) => item),
      (item) => /vance/i.test(`${item.headline} ${item.summary}`) && /iran|talk|diplom|security|negotiat/i.test(`${item.headline} ${item.summary}`),
    ) / 2,
  );

  const iranOilSignal = clamp01(
    sumConfidence(
      lower.map(({ item }) => item),
      (item) => /iran/i.test(`${item.headline} ${item.summary}`) && /oil|refiner|barrel|crude|export|shipping/i.test(`${item.headline} ${item.summary}`),
    ) / 2.4,
  );

  const usdDominanceSignal = clamp01(
    sumConfidence(
      lower.map(({ item }) => item),
      (item) =>
        /swift|dollar|usd|sanction|clearing|reserve currency|settlement|payments|payment channel|cross-border payment|financial plumbing|euro|european|exchange|fx|foreign exchange|yuan|renminbi|dirham|local currency|non-dollar|de-dollar/i
          .test(`${item.headline} ${item.summary}`) &&
        /iran|oil|crude|refiner|shipping|bank|banking|treasury|sanction|trade|export|europe|china|payments/i
          .test(`${item.headline} ${item.summary}`),
    ) / 1.8,
  );

  const narrativeDivergenceSignal = clamp01(
    (1 - reportedShare) * 0.45 +
      clamp01(
        Math.abs(
          sumConfidence(evidenceList, (item) => item.supports_hypotheses.length > 0) / totalConfidence -
            sumConfidence(evidenceList, (item) => item.weakens_hypotheses.length > 0) / totalConfidence,
        ) * 0.75,
      ) * 0.55,
  );

  const features: Feature[] = [
    {
      name: "trip_delay_signal",
      value: Number(tripDelaySignal.toFixed(4)),
      explanation: "Measures whether travel timing or cancellation reporting suggests crisis reprioritization.",
      confidence: Number(Math.max(reportedShare, 0.35).toFixed(4)),
    },
    {
      name: "vance_visibility_signal",
      value: Number(vanceVisibilitySignal.toFixed(4)),
      explanation: "Measures whether Vance visibility is rising in Iran-related messaging, talks, or security framing.",
      confidence: Number(Math.max(reportedShare * 0.9, 0.32).toFixed(4)),
    },
    {
      name: "iran_oil_signal",
      value: Number(iranOilSignal.toFixed(4)),
      explanation: "Measures evidence that oil flows, refiners, or Hormuz-related leverage are part of the active bargaining field.",
      confidence: Number(Math.max(reportedShare * 0.92, 0.36).toFixed(4)),
    },
    {
      name: "usd_dominance_signal",
      value: Number(usdDominanceSignal.toFixed(4)),
      explanation: "Measures whether sanctions plumbing, settlement rails, SWIFT, dollar-clearing, FX channels, or alternative-currency trade mechanisms are visibly shaping policy behavior.",
      confidence: Number(Math.max(reportedShare * 0.88, 0.34).toFixed(4)),
    },
    {
      name: "narrative_divergence_signal",
      value: Number(narrativeDivergenceSignal.toFixed(4)),
      explanation: "Measures divergence between reported facts and higher-level geopolitical inference, increasing uncertainty when elevated.",
      confidence: Number(Math.max(0.4, 1 - narrativeDivergenceSignal * 0.4).toFixed(4)),
    },
  ];

  return features.map((feature) => ({
    ...feature,
    value: Number(clamp01(feature.value).toFixed(4)),
    confidence: Number(clamp01(feature.confidence).toFixed(4)),
  }));
}
