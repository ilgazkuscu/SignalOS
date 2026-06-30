import type { Feature, Scenario } from "@/lib/geopolitical-thesis/types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function featureValue(features: Feature[], name: string) {
  return features.find((feature) => feature.name === name)?.value ?? 0;
}

function normalize(raw: Array<Omit<Scenario, "probability"> & { raw: number }>): Scenario[] {
  const total = raw.reduce((sum, item) => sum + item.raw, 0);
  const safeTotal = total > 0 ? total : 1;
  const normalized = raw.map((item) => ({
    id: item.id,
    label: item.label,
    probability: item.raw / safeTotal,
    drivers: item.drivers,
    invalidation_conditions: item.invalidation_conditions,
  }));
  const rounded = normalized.map((item) => ({
    ...item,
    probability: Number(item.probability.toFixed(4)),
  }));
  const roundedTotal = rounded.reduce((sum, item) => sum + item.probability, 0);
  const diff = Number((1 - roundedTotal).toFixed(4));
  if (rounded.length > 0) {
    rounded[0] = {
      ...rounded[0],
      probability: Number(clamp01(rounded[0].probability + diff).toFixed(4)),
    };
  }
  return rounded;
}

export function computeScenarios(features: Feature[]): Scenario[] {
  const trip = featureValue(features, "trip_delay_signal");
  const vance = featureValue(features, "vance_visibility_signal");
  const oil = featureValue(features, "iran_oil_signal");
  const usd = featureValue(features, "usd_dominance_signal");
  const divergence = featureValue(features, "narrative_divergence_signal");

  const raw = [
    {
      id: "S1",
      label: "Noise",
      raw: 0.22 + (1 - Math.max(trip, oil, usd, vance)) * 0.35 + divergence * 0.15,
      drivers: ["Signals remain mixed and no single thesis is dominating."],
      invalidation_conditions: ["Clear official sequencing or repeated confirming evidence across sources."],
    },
    {
      id: "S2",
      label: "Bargaining delay",
      raw: 0.18 + trip * 0.55 + divergence * 0.12,
      drivers: ["Travel disruption and schedule slippage imply negotiation or crisis reprioritization."],
      invalidation_conditions: ["Trip timing normalizes or follow-up reporting frames the change as routine."],
    },
    {
      id: "S3",
      label: "Energy deal",
      raw: 0.14 + oil * 0.5 + usd * 0.16,
      drivers: ["Oil flow and shipping evidence suggests energy leverage is part of the bargaining set."],
      invalidation_conditions: ["Oil-flow stories fade without corroboration or Hormuz risk de-escalates cleanly."],
    },
    {
      id: "S4",
      label: "Vance optics",
      raw: 0.11 + vance * 0.6 + trip * 0.1,
      drivers: ["Vance visibility suggests deliberate optics, message testing, or factional signaling."],
      invalidation_conditions: ["Vance visibility recedes or is overtaken by direct principal-level action."],
    },
    {
      id: "S5",
      label: "Hawk-dove split",
      raw: 0.15 + divergence * 0.35 + vance * 0.12 + usd * 0.08,
      drivers: ["Narrative divergence suggests internal factional differences rather than a single coherent line."],
      invalidation_conditions: ["Unified messaging emerges across principals and agencies."],
    },
    {
      id: "S6",
      label: "Thesis failure",
      raw: 0.1 + divergence * 0.4 + (1 - Math.max(trip, oil, usd, vance)) * 0.12,
      drivers: ["The explanatory hypotheses may be overfitting thin or ambiguous evidence."],
      invalidation_conditions: ["Repeated reported evidence aligns cleanly with a single scenario."],
    },
  ];

  return normalize(raw);
}
