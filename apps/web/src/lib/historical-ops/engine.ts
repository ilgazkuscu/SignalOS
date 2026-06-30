import { differenceInDays, differenceInWeeks } from "date-fns";
import { historicalCampaignLibrary } from "@/lib/historical-ops/campaign-library";
import type {
  ActionType,
  ActionTypeProbability,
  ARIMAXFeatureVector,
  HistoricalPatternAssessment,
  HistoricalPatternMatch,
  MarketSnapshot,
  OperationIndicator,
  OperationalPhaseScore,
  Signal,
  SourceEvent,
} from "@/lib/types/domain";

const ACTION_TYPES: ActionType[] = [
  "initiation",
  "escalation",
  "sustainment",
  "operational_pause",
  "coercive_settlement",
  "genuine_termination",
  "retrograde_with_cover",
  "withdrawal_without_termination",
];

const ACTION_DIRECTION: Record<ActionType, ActionTypeProbability["direction"]> = {
  initiation: "lowers_real_end",
  escalation: "lowers_real_end",
  sustainment: "lowers_real_end",
  operational_pause: "mixed",
  coercive_settlement: "mixed",
  genuine_termination: "raises_real_end",
  retrograde_with_cover: "mixed",
  withdrawal_without_termination: "mixed",
};

const ARIMAX_SPECS: Record<
  ActionType,
  {
    intercept: number;
    autoregressive: number[];
    exogenous: Partial<Record<keyof ARIMAXFeatureVector, number>>;
    doctrineNotes: string[];
  }
> = {
  initiation: {
    intercept: -0.6,
    autoregressive: [0.28, 0.18, 0.1, 0.05],
    exogenous: {
      tankerSortieTempo: 0.8,
      airBridgeDensity: 0.7,
      militaryCargoArrivals: 0.65,
      forceMovementScore: 0.55,
      institutionalAlignment: 0.18,
      daysSinceMajorStrike: -0.2,
    },
    doctrineNotes: ["Shaping phases typically show logistics and command buildup before decisive action."],
  },
  escalation: {
    intercept: -0.4,
    autoregressive: [0.32, 0.18, 0.08, 0.04],
    exogenous: {
      strikePackageTempo: 0.8,
      retaliationThreatLanguage: 0.55,
      crossBorderStrikeIndicator: 0.6,
      tankerSortieTempo: 0.35,
      forceMovementScore: 0.45,
      regionalSpilloverIndex: 0.25,
    },
    doctrineNotes: ["Escalation tends to combine strike tempo with support and threat signaling."],
  },
  sustainment: {
    intercept: -0.25,
    autoregressive: [0.38, 0.22, 0.12, 0.06],
    exogenous: {
      tankerSortieTempo: 0.45,
      isrPersistence: 0.55,
      supportVesselDensity: 0.4,
      strikePackageTempo: 0.4,
      militaryCargoArrivals: 0.35,
      explicitEndLanguage: -0.35,
    },
    doctrineNotes: ["Sustainment shows persistent support networks even when media tone cools."],
  },
  operational_pause: {
    intercept: -0.2,
    autoregressive: [0.24, 0.16, 0.08, 0.04],
    exogenous: {
      strikePackageTempo: -0.55,
      tankerSortieTempo: 0.2,
      isrPersistence: 0.25,
      officialMeetings: 0.2,
      mediatorActivity: 0.18,
      daysSinceMajorStrike: 0.2,
    },
    doctrineNotes: ["Operational pauses reduce visible kinetics while preserving posture options."],
  },
  coercive_settlement: {
    intercept: -0.45,
    autoregressive: [0.2, 0.16, 0.08, 0.04],
    exogenous: {
      officialMeetings: 0.5,
      mediatorActivity: 0.45,
      ceasefireReferences: 0.48,
      institutionalAlignment: 0.18,
      strikePackageTempo: 0.1,
      explicitEndLanguage: 0.2,
    },
    doctrineNotes: ["Coercive settlement often overlaps diplomacy with retained military leverage."],
  },
  genuine_termination: {
    intercept: -0.8,
    autoregressive: [0.16, 0.1, 0.06, 0.02],
    exogenous: {
      tankerSortieTempo: -0.5,
      airBridgeDensity: -0.35,
      isrPersistence: -0.2,
      militaryCargoArrivals: -0.25,
      explicitEndLanguage: 0.8,
      officialMeetings: 0.22,
      ceasefireReferences: 0.28,
      daysSinceMajorStrike: 0.32,
    },
    doctrineNotes: ["Genuine termination requires more than a pause: sustained drawdown and durable political closure."],
  },
  retrograde_with_cover: {
    intercept: -0.55,
    autoregressive: [0.22, 0.16, 0.1, 0.05],
    exogenous: {
      tankerSortieTempo: -0.22,
      airBridgeDensity: 0.4,
      militaryCargoArrivals: 0.7,
      isrPersistence: 0.2,
      supportVesselDensity: -0.2,
      officialMeetings: 0.15,
      daysSinceMajorStrike: 0.28,
    },
    doctrineNotes: ["Retrograde often keeps logistics and overwatch elevated even as offensive action falls."],
  },
  withdrawal_without_termination: {
    intercept: -0.7,
    autoregressive: [0.18, 0.12, 0.08, 0.03],
    exogenous: {
      explicitEndLanguage: 0.2,
      militaryCargoArrivals: 0.55,
      airBridgeDensity: 0.45,
      isrPersistence: 0.18,
      regionalSpilloverIndex: 0.25,
      strikePackageTempo: -0.2,
    },
    doctrineNotes: ["Physical withdrawal can occur while strategic instability remains unresolved."],
  },
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function normalizeProbabilities(values: Record<ActionType, number>) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value / total]),
  ) as Record<ActionType, number>;
}

function countMatches(items: string[], keywords: string[]) {
  return items.filter((text) => keywords.some((keyword) => text.includes(keyword))).length;
}

function recentWindowMass(items: Array<{ occurredAt: string; magnitude: number }>, now: Date, weeks: number) {
  return items
    .filter((item) => differenceInWeeks(now, new Date(item.occurredAt)) < weeks)
    .reduce((sum, item) => sum + item.magnitude, 0);
}

export function buildHistoricalPatternAssessment({
  now,
  signals,
  sourceEvents,
  operationIndicators,
  marketSnapshots,
}: {
  now: Date;
  signals: Signal[];
  sourceEvents: SourceEvent[];
  operationIndicators: OperationIndicator[];
  marketSnapshots: MarketSnapshot[];
}): HistoricalPatternAssessment {
  const normalizedTexts = [
    ...signals.map((signal) => `${signal.family} ${signal.subtype} ${signal.rationale} ${JSON.stringify(signal.rawPayload)}`.toLowerCase()),
    ...sourceEvents.map((event) => `${event.title} ${event.body} ${event.tags.join(" ")} ${JSON.stringify(event.rawPayload)}`.toLowerCase()),
  ];

  const verifiedSignals = signals.filter((signal) => signal.status === "verified");
  const signalMass = verifiedSignals.map((signal) => ({
    occurredAt: signal.occurredAt,
    magnitude: Math.abs(signal.magnitude) * signal.confidence,
  }));

  const indicator = (id: string) => operationIndicators.find((item) => item.id === id)?.value ?? 0;
  const marketProbability =
    marketSnapshots.reduce((sum, snapshot) => sum + snapshot.yesPrice, 0) / Math.max(marketSnapshots.length, 1);

  const featureVector: ARIMAXFeatureVector = {
    tankerSortieTempo: indicator("tanker-bridge"),
    airBridgeDensity: clamp(countMatches(normalizedTexts, ["air bridge", "cargo", "reach", "c-17", "lift"]) * 0.18),
    isrPersistence: indicator("isr-tempo"),
    militaryCargoArrivals: clamp(countMatches(normalizedTexts, ["cargo", "c-17", "sealift", "logistics", "airlift"]) * 0.16),
    refuelingTrackPersistence: clamp(countMatches(normalizedTexts, ["refuel", "kc-46", "kc-135", "aerial refueling"]) * 0.18),
    strikePackageTempo: clamp(countMatches(normalizedTexts, ["sortie", "strike", "bomber", "target package"]) * 0.16),
    tankerCorridorDensity: clamp(countMatches(normalizedTexts, ["tanker corridor", "shipping lane", "hormuz", "crude tanker"]) * 0.16),
    rerouteSlowdownAnomaly: clamp(countMatches(normalizedTexts, ["reroute", "slowdown", "loiter", "diversion"]) * 0.22),
    supportVesselDensity: clamp(countMatches(normalizedTexts, ["replenishment", "support vessel", "escort", "convoy"]) * 0.18),
    convoyEscortCoMovement: clamp(countMatches(normalizedTexts, ["escort", "convoy", "amphibious", "carrier"]) * 0.18),
    aisDarkActivity: clamp(countMatches(normalizedTexts, ["ais dark", "transponder off", "dark activity"]) * 0.25),
    portCallIrregularity: clamp(countMatches(normalizedTexts, ["port call", "irregular", "berth", "anchorage"]) * 0.18),
    officialMeetings: clamp(countMatches(normalizedTexts, ["meeting", "talks", "summit", "muscat"]) * 0.14),
    mediatorActivity: clamp(countMatches(normalizedTexts, ["mediator", "oman", "qatar", "shuttle talks"]) * 0.18),
    ceasefireReferences: clamp(countMatches(normalizedTexts, ["ceasefire", "truce", "pause"]) * 0.12),
    explicitEndLanguage: clamp(countMatches(normalizedTexts, ["operations have concluded", "operations concluded", "military operations against iran have concluded"]) * 0.45),
    institutionalAlignment: clamp(countMatches(normalizedTexts, ["white house", "dod", "centcom", "president"]) * 0.08),
    strikeEventCount: clamp(countMatches(normalizedTexts, ["strike", "retaliation", "attack"]) * 0.12),
    crossBorderStrikeIndicator: clamp(countMatches(normalizedTexts, ["cross-border", "cross border", "across the border"]) > 0 ? 1 : 0),
    forceMovementScore: indicator("carrier-posture") * 0.5 + indicator("munitions-logistics") * 0.5,
    weaponsDeploymentIndicator: clamp(countMatches(normalizedTexts, ["patriot", "thaad", "deployment", "munitions"]) * 0.18),
    retaliationThreatLanguage: clamp(countMatches(normalizedTexts, ["retaliat", "will respond", "all options", "threat"]) * 0.14),
    daysSinceMajorStrike: clamp(
      Math.min(
        30,
        Math.max(
          0,
          ...sourceEvents
            .filter((event) => /strike|sortie|retaliat|attack/i.test(`${event.title} ${event.body}`))
            .map((event) => differenceInDays(now, new Date(event.occurredAt))),
        ),
      ) / 30,
    ),
    daysToDeadline: clamp(
      Math.max(
        0,
        differenceInDays(new Date(marketSnapshots[0]?.timestamp ?? now.toISOString()), now),
      ) / 30,
    ),
    oilStress: clamp(countMatches(normalizedTexts, ["oil", "crude", "hormuz", "shipping"]) * 0.1),
    marketProbability: clamp(marketProbability),
    regionalSpilloverIndex: clamp(countMatches(normalizedTexts, ["proxy", "militia", "red sea", "shipping", "hormuz"]) * 0.14),
    seasonality: clamp((now.getUTCMonth() + 1) / 12),
  };

  const recentMasses = [1, 2, 4, 8].map((weeks) => recentWindowMass(signalMass, now, weeks));
  const actionWeights = {} as Record<ActionType, number>;
  const phaseScores: OperationalPhaseScore[] = [];

  for (const actionType of ACTION_TYPES) {
    const spec = ARIMAX_SPECS[actionType];
    let score = spec.intercept;
    recentMasses.forEach((mass, index) => {
      score += mass * (spec.autoregressive[index] ?? 0);
    });
    for (const [featureName, coefficient] of Object.entries(spec.exogenous)) {
      score += (featureVector[featureName as keyof ARIMAXFeatureVector] ?? 0) * (coefficient ?? 0);
    }
    const probabilityLike = sigmoid(score);
    actionWeights[actionType] = probabilityLike;
    phaseScores.push({
      actionType,
      currentProbability: probabilityLike,
      transitionProbability: clamp(probabilityLike * 0.62 + (recentMasses[0] > recentMasses[2] ? 0.08 : 0)),
      horizonTerminationProbability: clamp(
        actionType === "genuine_termination"
          ? probabilityLike * 0.95
          : actionType === "retrograde_with_cover"
            ? probabilityLike * 0.55
            : actionType === "coercive_settlement"
              ? probabilityLike * 0.48
              : probabilityLike * 0.18,
      ),
    });
  }

  const normalized = normalizeProbabilities(actionWeights);
  const topSignalLabels = operationIndicators
    .filter((item) => item.value > 0.18)
    .map((item) => item.label)
    .slice(0, 5);
  const contradictionLabels =
    featureVector.explicitEndLanguage > 0.1 && featureVector.airBridgeDensity > 0.45
      ? ["Explicit end-language is ahead of physical drawdown signals."]
      : featureVector.strikePackageTempo < 0.1 && featureVector.airBridgeDensity > 0.45
        ? ["Strike tempo is falling faster than support posture."]
        : [];

  const actionTypeProbabilities: ActionTypeProbability[] = ACTION_TYPES.map((actionType) => {
    const spec = ARIMAX_SPECS[actionType];
    const supportingVariables = Object.entries(spec.exogenous)
      .filter(([featureName, coefficient]) => (featureVector[featureName as keyof ARIMAXFeatureVector] ?? 0) * (coefficient ?? 0) > 0.08)
      .map(([featureName]) => featureName);
    const contradictingVariables = Object.entries(spec.exogenous)
      .filter(([featureName, coefficient]) => (featureVector[featureName as keyof ARIMAXFeatureVector] ?? 0) * (coefficient ?? 0) < -0.05)
      .map(([featureName]) => featureName);
    const historicalAnalogs = historicalCampaignLibrary
      .flatMap((campaign) =>
        campaign.phases
          .filter((phase) => phase.actionType === actionType)
          .map((phase) => {
            const similarity =
              clamp(
                phase.forceBuildupIndicators.filter((item) => supportingVariables.includes(camelize(item))).length * 0.18 +
                  phase.logisticsDrawdownSignals.filter((item) => supportingVariables.includes(camelize(item))).length * 0.18 +
                  phase.settlementSignals.filter((item) => supportingVariables.includes(camelize(item))).length * 0.14 +
                  normalized[actionType] * 0.4,
              );
            return {
              campaignId: campaign.id,
              campaignLabel: `${campaign.label} - ${phase.label}`,
              actionType,
              similarity,
              rationale: phase.politicalTrigger,
              doctrineNotes: campaign.doctrineNotes,
            } satisfies HistoricalPatternMatch;
          }),
      )
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, 3);

    return {
      actionType,
      probability: normalized[actionType],
      direction: ACTION_DIRECTION[actionType],
      historicalAnalogs,
      supportingVariables,
      contradictingVariables,
      confidence: clamp(0.38 + topSignalLabels.length * 0.08 + spec.doctrineNotes.length * 0.04 - contradictionLabels.length * 0.08),
      doctrineNotes: spec.doctrineNotes,
    };
  }).sort((left, right) => right.probability - left.probability);

  const getProb = (actionType: ActionType) => actionTypeProbabilities.find((item) => item.actionType === actionType)?.probability ?? 0;
  const genuineTermination = getProb("genuine_termination");
  const retrograde = getProb("retrograde_with_cover");
  const escalation = getProb("escalation");
  const sustainment = getProb("sustainment");
  const pause = getProb("operational_pause");
  const coerciveSettlement = getProb("coercive_settlement");
  const withdrawalWithoutTermination = getProb("withdrawal_without_termination");

  const adjustment = {
    realEndDelta: clamp(genuineTermination * 0.18 + retrograde * 0.09 + coerciveSettlement * 0.05 - escalation * 0.12 - sustainment * 0.08, -0.18, 0.2),
    formalAnnouncementDelta: clamp(coerciveSettlement * 0.08 + genuineTermination * 0.06 - withdrawalWithoutTermination * 0.04, -0.08, 0.14),
    frictionDelta: clamp(retrograde * 0.08 + withdrawalWithoutTermination * 0.12 + pause * 0.04 - genuineTermination * 0.1 - coerciveSettlement * 0.05, -0.14, 0.18),
    confidenceDelta: clamp((genuineTermination + retrograde + coerciveSettlement) * 0.08 - contradictionLabels.length * 0.03, -0.04, 0.12),
    notes: [
      `Top action type is ${actionTypeProbabilities[0]?.actionType ?? "undetermined"} at ${((actionTypeProbabilities[0]?.probability ?? 0) * 100).toFixed(1)}%.`,
      genuineTermination > retrograde
        ? "Historical pattern engine leans toward genuine termination rather than pure retrograde."
        : "Historical pattern engine still sees stronger retrograde/cover dynamics than clean termination.",
      ...contradictionLabels,
    ],
  };

  const confidence = clamp(
    actionTypeProbabilities.slice(0, 3).reduce((sum, item) => sum + item.confidence * item.probability, 0) +
      Math.min(0.16, sourceEvents.length * 0.01),
  );

  return {
    generatedAt: now.toISOString(),
    featureVector,
    actionTypeProbabilities,
    operationalPhaseScores: phaseScores.sort((left, right) => right.currentProbability - left.currentProbability),
    historicalCampaigns: historicalCampaignLibrary,
    adjustment,
    confidence,
    summary:
      genuineTermination + retrograde > escalation + sustainment
        ? "Historical U.S. analogs currently look more like controlled drawdown or retrograde than renewed campaign expansion."
        : "Historical U.S. analogs still resemble active sustainment or escalation more than credible termination.",
  };
}

function camelize(value: string) {
  return value
    .replace(/[^a-z0-9]+(.)/gi, (_, char: string) => char.toUpperCase())
    .replace(/[^a-z0-9]/gi, "");
}
