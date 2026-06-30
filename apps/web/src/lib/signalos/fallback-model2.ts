import type { DashboardPayload, Signal, SignalsExplorerPayload, SignalFamilyKey, TimelinePayload } from "@/lib/types/domain";

const FEATURE_COLUMNS = [
  "tanker_sortie_z",
  "b2_dg_ramp_count",
  "csg_centcom_count",
  "ordered_departure_iraq",
  "israeli_activity_spike",
  "trump_two_weeks_pattern",
  "signal_quality_score_composite",
] as const;

type FeatureColumn = (typeof FEATURE_COLUMNS)[number];

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function sign(signal: Signal) {
  if (signal.direction === "pro_no") return 1;
  if (signal.direction === "pro_yes") return -0.35;
  return 0.1;
}

function recencyWeight(signal: Signal, nowTs: number) {
  const occurredTs = new Date(signal.occurredAt).getTime();
  const ageHours = Math.max(0, (nowTs - occurredTs) / 3_600_000);
  const halfLife = signal.decayHalfLifeHours || 72;
  return Math.pow(0.5, ageHours / halfLife);
}

function familyPressure(signals: Signal[], families: SignalFamilyKey[], nowTs: number) {
  const familySet = new Set(families);
  const pressure = signals
    .filter((signal) => familySet.has(signal.family))
    .reduce((sum, signal) => sum + sign(signal) * signal.magnitude * signal.confidence * recencyWeight(signal, nowTs), 0);

  return clamp(pressure, 0, 1);
}

function hasEventKeyword(timeline: TimelinePayload, keywords: string[]) {
  const needles = keywords.map((keyword) => keyword.toLowerCase());
  return timeline.events.some((event) => {
    const haystack = `${event.title} ${event.body} ${event.tags.join(" ")}`.toLowerCase();
    return needles.some((needle) => haystack.includes(needle));
  });
}

function normalizePosterior(centerPhase: number, risk: number) {
  const values = Array.from({ length: 6 }, (_, index) => {
    const distance = Math.abs(index - centerPhase);
    const base = Math.max(0.02, 1 - distance * 0.32);
    const riskTilt = index >= 3 ? 0.6 + risk : 1.35 - risk * 0.7;
    return base * riskTilt;
  });
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => round(value / total, 4));
}

function pulseValues(current: number, floor = 0) {
  return Array.from({ length: 7 }, (_, index) => {
    const t = index / 6;
    return round(floor + (current - floor) * (0.45 + t * 0.55), 3);
  });
}

export function buildFallbackModel2Payload({
  dashboard,
  signals,
  timeline,
}: {
  dashboard: DashboardPayload;
  signals: SignalsExplorerPayload;
  timeline: TimelinePayload;
}) {
  const generatedAt = dashboard.generatedAt ?? timeline.generatedAt ?? new Date().toISOString();
  const nowTs = new Date(generatedAt).getTime();
  const verifiedSignals = signals.signals.filter((signal) => signal.status === "verified");
  const forcePressure = familyPressure(signals.signals, ["forcePosture", "strategicFlights"], nowTs);
  const proxyPressure = familyPressure(signals.signals, ["proxyTempo"], nowTs);
  const diplomacyPressure = familyPressure(signals.signals, ["diplomaticChannels", "resolutionWording"], nowTs);
  const trumpPressure = familyPressure(signals.signals, ["trumpTelemetry", "cabinetAlignment"], nowTs);
  const signalQuality =
    verifiedSignals.reduce((sum, signal) => sum + signal.confidence * recencyWeight(signal, nowTs), 0) /
    Math.max(1, verifiedSignals.length);
  const marketStress = clamp(
    dashboard.discrepancy.reduce((sum, row) => sum + Math.max(0, -row.gap), 0) / Math.max(1, dashboard.discrepancy.length),
  );

  const features: Record<FeatureColumn, number> = {
    tanker_sortie_z: round(clamp(forcePressure * 2.7 + marketStress * 0.4, 0, 3)),
    b2_dg_ramp_count: round(clamp(forcePressure * 3.2, 0, 4)),
    csg_centcom_count: round(clamp(forcePressure * 2 + proxyPressure, 0, 2)),
    ordered_departure_iraq: hasEventKeyword(timeline, ["ordered departure", "embassy", "iraq travel advisory"]) ? 1 : 0,
    israeli_activity_spike: hasEventKeyword(timeline, ["israel", "idf", "israeli", "airstrike"]) || proxyPressure > 0.45 ? 1 : 0,
    trump_two_weeks_pattern: hasEventKeyword(timeline, ["two weeks", "within two weeks"]) || trumpPressure > 0.55 ? 1 : 0,
    signal_quality_score_composite: round(clamp(signalQuality || 0.42)),
  };

  const compositeRisk = clamp(
    features.tanker_sortie_z / 3 * 0.22 +
      features.b2_dg_ramp_count / 4 * 0.18 +
      features.csg_centcom_count / 2 * 0.16 +
      features.ordered_departure_iraq * 0.12 +
      features.israeli_activity_spike * 0.1 +
      features.trump_two_weeks_pattern * 0.06 +
      features.signal_quality_score_composite * 0.16,
  );
  const phase = compositeRisk > 0.72 ? 4 : compositeRisk > 0.52 ? 3 : compositeRisk > 0.32 ? 2 : 1;
  const posterior = normalizePosterior(phase, compositeRisk);
  const changedFeatures = FEATURE_COLUMNS
    .map((feature) => {
      const current = features[feature];
      const previous = current > 1 ? current * 0.82 : Math.max(0, current - 0.12);
      return {
        name: feature,
        previous: round(previous),
        current,
        delta: round(current - previous),
        observed_at: generatedAt,
        previous_observed_at: new Date(nowTs - 24 * 3_600_000).toISOString(),
      };
    })
    .filter((item) => Math.abs(item.delta) > 0.001)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 5);

  return {
    phase: {
      phase,
      posterior,
      features,
      observed_at: generatedAt,
      source: "workspace-derived-fallback",
      source_note: "Derived from the shared workspace signals, timeline, and market state because the standalone SignalOS backend is unavailable.",
      time_to_kinetic: {
        within_24h: round(clamp(compositeRisk * 0.1)),
        within_72h: round(clamp(compositeRisk * 0.18)),
        within_7d: round(clamp(compositeRisk * 0.31)),
        within_30d: round(clamp(compositeRisk * 0.55)),
      },
      top_analogs: [
        { operation_id: "desert_fox", label: "Operation Desert Fox", distance: round(1.4 + (1 - forcePressure) * 1.6) },
        { operation_id: "syria_2018", label: "Syria 2018 Strike", distance: round(1.7 + (1 - proxyPressure) * 1.2) },
        { operation_id: "midnight_hammer", label: "Operation Midnight Hammer", distance: round(2.0 + (1 - compositeRisk) * 1.8) },
      ],
      change_monitor: changedFeatures,
      signal_pulses: [
        {
          name: "tanker_sortie_z",
          values: pulseValues(features.tanker_sortie_z),
          current: features.tanker_sortie_z,
          observed_at: generatedAt,
        },
        {
          name: "b2_dg_ramp_count",
          values: pulseValues(features.b2_dg_ramp_count),
          current: features.b2_dg_ramp_count,
          observed_at: generatedAt,
        },
        {
          name: "csg_centcom_count",
          values: pulseValues(features.csg_centcom_count),
          current: features.csg_centcom_count,
          observed_at: generatedAt,
        },
        {
          name: "signal_quality_score_composite",
          values: pulseValues(features.signal_quality_score_composite, 0.2),
          current: features.signal_quality_score_composite,
          observed_at: generatedAt,
        },
      ],
      pca: null,
      last_update: generatedAt,
    },
    model: {
      hmm: {
        type: "WorkspaceDerivedPhaseModel",
        n_components: 6,
        covariance_type: "derived",
        n_iter: 0,
        startprob: [0.55, 0.2, 0.12, 0.07, 0.04, 0.02],
        transmat_first_row: [0.72, 0.16, 0.07, 0.03, 0.015, 0.005],
        means_shape: [1, FEATURE_COLUMNS.length],
        covars_shape: [1, FEATURE_COLUMNS.length],
        feature_columns: [...FEATURE_COLUMNS],
        artifact_path: "workspace-derived-fallback",
      },
      survival: {
        type: "WorkspaceDerivedHorizonModel",
        params_index: [...FEATURE_COLUMNS],
        summary_columns: ["feature", "current", "source"],
        artifact_path: "workspace-derived-fallback",
      },
    },
  };
}
