import { differenceInHours } from "date-fns";
import type {
  BeliefState,
  DriverContribution,
  HistoricalPatternAdjustment,
  MarketDefinition,
  MarketId,
  MarketSnapshot,
  ScenarioEventInput,
  Signal,
  WeightProfileKey,
} from "@/lib/types/domain";
import { computeConfidence } from "@/lib/engine/confidence";
import { createDriverNarrative, determineAffectedLatents, splitDrivers } from "@/lib/engine/explanations";
import { getWeightProfile } from "@/lib/engine/profiles";
import { buildPriorCurve } from "@/lib/engine/prior";
import { decayFactor } from "@/lib/utils/time";
import { clamp, round } from "@/lib/utils/math";
import { averageProbability, ensureProbability } from "@/lib/utils/probability";
import { compareIsoAsc } from "@/lib/utils/sort";

export interface EngineContext {
  markets: MarketDefinition[];
  signals: Signal[];
  marketSnapshots: MarketSnapshot[];
}

export interface EngineOptions {
  now: Date;
  profileKey: WeightProfileKey;
  historicalPatternAdjustment?: HistoricalPatternAdjustment;
  historicalActionTypeProbabilities?: BeliefState["historicalActionTypeProbabilities"];
  historicalPatternSummary?: string;
}

const BASE_REAL_HAZARD = 0.018;
const BASE_ANNOUNCEMENT_HAZARD = 0.012;

export class BeliefEngine {
  constructor(private readonly context: EngineContext) {}

  ingestSignal(signal: Signal): BeliefEngine {
    return new BeliefEngine({
      ...this.context,
      signals: [...this.context.signals, signal],
    });
  }

  recomputeBelief(options: EngineOptions): BeliefState {
    const profile = getWeightProfile(options.profileKey);
    const orderedSignals = [...this.context.signals].sort((a, b) => compareIsoAsc(a.occurredAt, b.occurredAt));
    const activeSignals = orderedSignals.filter(
      (signal) => new Date(signal.occurredAt) <= options.now && signal.status === "verified",
    );

    const prior = buildPriorCurve({
      markets: this.context.markets,
      now: options.now,
      activeHostilities: 0.48,
      ceasefireStatus: 0.36,
      formalWindDownTendency: 0.64,
      baselineConflictDurationDays: 40,
    });

    let realLedger = 0;
    let formalLedger = 0;
    let friction = 0.22;
    let explicitWordingImpulse = 0;
    let trueEndImpulse = 0;
    let qualifyingCatalyst = 0;
    let contradictionLoad = 0;
    const seenCorrelationKeys = new Map<string, number>();
    const drivers: DriverContribution[] = [];

    for (const signal of activeSignals) {
      const familyWeight = profile.familyWeights[signal.family] ?? 0;
      const hoursElapsed = Math.max(0, differenceInHours(options.now, new Date(signal.occurredAt)));
      const recency = decayFactor(hoursElapsed, Math.min(signal.decayHalfLifeHours, profile.recencyHalfLifeHours));
      const confidence = ensureProbability(signal.confidence);
      const signedMagnitude =
        signal.direction === "pro_no" ? -Math.abs(signal.magnitude) : signal.direction === "neutral" ? 0 : Math.abs(signal.magnitude);

      const contradictionPenaltyBase =
        signal.family === "proxyTempo" && signedMagnitude < 0
          ? profile.contradictionPenalty * Math.abs(signedMagnitude)
          : signal.family === "resolutionWording" && signedMagnitude < 0
            ? profile.contradictionPenalty * 0.8 * Math.abs(signedMagnitude)
            : 0;

      let correlationPenaltyApplied = 0;
      if (signal.correlationKey) {
        const count = seenCorrelationKeys.get(signal.correlationKey) ?? 0;
        correlationPenaltyApplied = clamp(count * profile.correlationPenalty * 0.16, 0, 0.55);
        seenCorrelationKeys.set(signal.correlationKey, count + 1);
      }

      const contradictionPenaltyApplied = clamp(contradictionPenaltyBase, 0, 0.6);
      const weightedMagnitude =
        signedMagnitude *
        familyWeight *
        confidence *
        recency *
        profile.confidenceMultiplier *
        (1 - contradictionPenaltyApplied) *
        (1 - correlationPenaltyApplied);

      const affects = determineAffectedLatents(signal.family);
      const qualifiesFeature = ensureProbability(Number(signal.derivedFeatures.qualifiesYesProbability ?? 0), 0);
      const trueEndFeature = ensureProbability(
        Number(
          signal.derivedFeatures.trueEndSupport ??
            signal.derivedFeatures.deescalationScore ??
            signal.derivedFeatures.announcementScore ??
            0,
        ),
        0,
      );

      const realShare = affects.includes("real_end") ? 1 : 0.2;
      const formalShare = affects.includes("formal_announcement") ? 1 : 0.18;
      const frictionShare = affects.includes("resolution_friction") ? 1 : 0.1;

      realLedger += weightedMagnitude * (0.75 * realShare + trueEndFeature * 0.55);
      formalLedger += weightedMagnitude * (0.7 * formalShare + qualifiesFeature * 0.85);
      trueEndImpulse += Math.max(0, weightedMagnitude) * (0.18 + trueEndFeature * 0.42);
      explicitWordingImpulse +=
        signal.family === "resolutionWording"
          ? weightedMagnitude * (0.34 + qualifiesFeature * 1.15 + trueEndFeature * 0.3)
          : 0;
      if (signal.family === "resolutionWording" && signedMagnitude > 0) {
        qualifyingCatalyst = Math.max(
          qualifyingCatalyst,
          clamp(confidence * (qualifiesFeature * 0.95 + Math.abs(signedMagnitude) * 0.55), 0, 1),
        );
        trueEndImpulse += confidence * recency * (trueEndFeature * 0.22 + qualifiesFeature * 0.18);
      }

      friction -= weightedMagnitude * 0.16 * frictionShare * profile.resolutionFrictionWeight;
      if (signal.family === "resolutionWording") {
        friction -= Math.max(0, signedMagnitude) * confidence * recency * qualifiesFeature * 0.32;
        friction += Math.max(0, -signedMagnitude) * confidence * recency * 0.18;
      }
      contradictionLoad += contradictionPenaltyApplied;

      drivers.push({
        signalId: signal.id,
        family: signal.family,
        title: signal.subtype,
        affects,
        pointsDelta: round(weightedMagnitude),
        confidence: signal.confidence,
        stale: hoursElapsed > signal.decayHalfLifeHours * 1.5,
        correlatedPenaltyApplied: round(correlationPenaltyApplied),
        contradictionPenaltyApplied: round(contradictionPenaltyApplied),
        narrative: createDriverNarrative(signal, familyWeight, weightedMagnitude, affects),
        sourceId: signal.sourceId,
        signalTimestamp: signal.occurredAt,
      });
    }

    const confidence = computeConfidence(activeSignals, drivers);
    const dailyRealHazard = round(clamp(BASE_REAL_HAZARD + realLedger * 0.085 + trueEndImpulse * 0.035, 0.001, 0.16), 4);
    const dailyAnnouncementHazard = round(
      clamp(BASE_ANNOUNCEMENT_HAZARD + formalLedger * 0.075 + explicitWordingImpulse * 0.03, 0.001, 0.16),
      4,
    );
    const historicalAdjustment = options.historicalPatternAdjustment;

    const yesProbabilityByContract = {} as Record<MarketId, number>;
    const noProbabilityByContract = {} as Record<MarketId, number>;
    const dateBucketProbabilities = {} as Record<MarketId, number>;
    const marginalBucketProbabilities = {} as Record<MarketId, number>;
    const decompositionByContract = {} as BeliefState["decompositionByContract"];
    const realProbabilities: number[] = [];
    const conditionalAnnouncementProbabilities: number[] = [];
    let previousCumulative = 0;

    for (const market of this.context.markets) {
      const priorReal = ensureProbability(prior.realDeescalationByDate[market.id], 0.2);
      const priorFormal = ensureProbability(prior.formalAnnouncementByDate[market.id], 0.14);
      const priorConditionalAnnouncement = ensureProbability(priorFormal / Math.max(priorReal, 0.05), 0.22);
      const daysToDeadline = Math.max(
        0,
        (new Date(market.deadlineAt).getTime() - options.now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const realByDate = Math.max(
        cumulativeFromHazard(priorReal, dailyRealHazard, daysToDeadline, trueEndImpulse),
        clamp(qualifyingCatalyst * 0.94, 0, 0.995),
      );
      const adjustedRealByDate = clamp(realByDate + (historicalAdjustment?.realEndDelta ?? 0), 0, 0.995);
      const announcementGivenEnd = cumulativeFromHazard(
        priorConditionalAnnouncement,
        dailyAnnouncementHazard,
        daysToDeadline,
        explicitWordingImpulse + qualifyingCatalyst * 0.8,
      );
      const adjustedAnnouncementGivenEnd = clamp(
        announcementGivenEnd + (historicalAdjustment?.formalAnnouncementDelta ?? 0),
        0,
        0.995,
      );
      const frictionMultiplier = clamp(
        1 -
          clamp(clamp(friction, 0.04, 0.88) + (historicalAdjustment?.frictionDelta ?? 0), 0.04, 0.92) * profile.resolutionFrictionWeight +
          clamp(explicitWordingImpulse, -0.12, 0.18) * 0.4 -
          contradictionLoad * 0.025,
        0.2,
        0.98,
      );

      const marketPrice = this.context.marketSnapshots.find((snapshot) => snapshot.marketId === market.id)?.yesPrice ?? 0.5;
      const marketFrictionAdjustment = clamp((0.5 - marketPrice) * 0.05, -0.03, 0.03);
      const rawYes = clamp(
        Math.max(
          adjustedRealByDate * adjustedAnnouncementGivenEnd * (frictionMultiplier + marketFrictionAdjustment),
          qualifyingCatalyst * adjustedRealByDate * clamp(frictionMultiplier + qualifyingCatalyst * 0.12, 0, 1),
        ),
        0,
        0.995,
      );
      const monotoneYes = Math.max(previousCumulative, rawYes);

      const roundedYes = round(clamp(monotoneYes, 0, 1));
      const roundedNo = round(clamp(1 - roundedYes, 0, 1));
      // Invariant: YES + NO must equal 1.0 after rounding
      const correctedNo = round(1 - roundedYes);

      dateBucketProbabilities[market.id] = roundedYes;
      marginalBucketProbabilities[market.id] = round(clamp(monotoneYes - previousCumulative, 0, 1));
      yesProbabilityByContract[market.id] = roundedYes;
      noProbabilityByContract[market.id] = correctedNo;
      decompositionByContract[market.id] = {
        realEndByDate: round(adjustedRealByDate),
        announcementGivenEnd: round(adjustedAnnouncementGivenEnd),
        frictionMultiplier: round(frictionMultiplier),
        yesProbability: roundedYes,
      };
      previousCumulative = monotoneYes;
      realProbabilities.push(adjustedRealByDate);
      conditionalAnnouncementProbabilities.push(adjustedAnnouncementGivenEnd);
    }

    const top = splitDrivers(drivers);
    const wordingRiskScore = round(
      clamp(
        Math.abs(explicitWordingImpulse) < 0.09 ? 0.18 : 0.08 +
          drivers
            .filter((driver) => driver.family === "resolutionWording" && driver.pointsDelta < 0)
            .reduce((sum, driver) => sum + Math.abs(driver.pointsDelta), 0) * 1.3 +
          clamp(friction, 0, 1) * 0.42,
      ),
    );
    const marketDislocationScore = round(
      clamp(
        averageProbability(
          this.context.marketSnapshots.map((snapshot) =>
            Math.abs((yesProbabilityByContract[snapshot.marketId] ?? 0.5) - snapshot.yesPrice),
          ),
          0,
        ) * 2,
      ),
    );

    const trueDeescalationProbability = round(ensureProbability(averageProbability(realProbabilities, 0.2), 0.2));
    const conditionalAnnouncementGivenEndProbability = round(
      ensureProbability(averageProbability(conditionalAnnouncementProbabilities, 0.22), 0.22),
    );
    const formalAnnouncementProbability = round(
      ensureProbability(trueDeescalationProbability * conditionalAnnouncementGivenEndProbability, 0.15),
    );

    return {
      asOf: options.now.toISOString(),
      profileKey: options.profileKey,
      trueDeescalationProbability,
      formalAnnouncementProbability,
      conditionalAnnouncementGivenEndProbability,
      dateBucketProbabilities,
      marginalBucketProbabilities,
      yesProbabilityByContract,
      noProbabilityByContract,
      decompositionByContract,
      dailyAnnouncementHazard,
      dailyRealDeescalationHazard: dailyRealHazard,
      resolutionFrictionScore: round(clamp(friction, 0.04, 0.88)),
      confidenceScore: round(clamp(confidence.score + (historicalAdjustment?.confidenceDelta ?? 0), 0, 1)),
      confidenceLabel: confidence.label,
      wordingRiskScore,
      marketDislocationScore,
      historicalActionTypeProbabilities: options.historicalActionTypeProbabilities,
      historicalPatternSummary: options.historicalPatternSummary,
      modelNotes: [
        ...prior.notes,
        ...confidence.explanation,
        ...(historicalAdjustment?.notes ?? []),
        "Contract YES is derived as P(real end by date) × P(qualifying announcement | real end) × friction multiplier.",
      ],
      topPositiveDrivers: top.topPositiveDrivers,
      topNegativeDrivers: top.topNegativeDrivers,
      staleSignals: top.staleSignals,
    };
  }

  explainBeliefChange(fromState: BeliefState, toState: BeliefState): string[] {
    return [
      `True de-escalation moved ${(toState.trueDeescalationProbability - fromState.trueDeescalationProbability) * 100 >= 0 ? "up" : "down"} by ${Math.abs((toState.trueDeescalationProbability - fromState.trueDeescalationProbability) * 100).toFixed(1)} points.`,
      `Conditional announcement odds moved ${(toState.conditionalAnnouncementGivenEndProbability - fromState.conditionalAnnouncementGivenEndProbability) * 100 >= 0 ? "up" : "down"} by ${Math.abs((toState.conditionalAnnouncementGivenEndProbability - fromState.conditionalAnnouncementGivenEndProbability) * 100).toFixed(1)} points.`,
      `Resolution friction is now ${toState.resolutionFrictionScore.toFixed(2)}, capturing the remaining wording gap.`,
    ];
  }

  simulateScenario(scenario: ScenarioEventInput[], options: EngineOptions): BeliefState {
    const augmentedSignals = scenario.map((event, index) => {
      const magnitude = Math.abs(event.magnitude);
      const direction: Signal["direction"] = event.magnitude >= 0 ? "pro_yes" : "pro_no";
      return {
        id: `scenario-${index}-${event.family}`,
        family: event.family,
        type: "scenario",
        subtype: event.title.toLowerCase().replace(/\s+/g, "_"),
        direction,
        magnitude,
        confidence: event.confidence,
        occurredAt: event.occurredAt,
        sourceId: "manual-scenario",
        sourceEventId: `manual-scenario-${index}`,
        rationale: event.rationale,
        derivedFeatures:
          event.derivedFeatures ??
          deriveScenarioFeatures(event.family, magnitude, direction),
        rawPayload: { scenario: true },
        extractionMethod: "scenario_injection",
        status: "verified" as const,
        decayHalfLifeHours: 160,
      };
    });

    return new BeliefEngine({
      ...this.context,
      signals: [...this.context.signals.map(cloneSignal), ...augmentedSignals],
    }).recomputeBelief(options);
  }

  replayRange(start: Date, end: Date, profileKey: WeightProfileKey): Array<{ asOf: string; belief: BeliefState }> {
    const timeline: Array<{ asOf: string; belief: BeliefState }> = [];
    let cursor = new Date(start);

    while (cursor <= end) {
      timeline.push({
        asOf: cursor.toISOString(),
        belief: this.recomputeBelief({ now: new Date(cursor), profileKey }),
      });
      cursor = new Date(cursor.getTime() + 1000 * 60 * 60 * 12);
    }

    return timeline.sort((a, b) => compareIsoAsc(a.asOf, b.asOf));
  }
}

function cumulativeFromHazard(priorProbability: number, dailyHazard: number, days: number, impulse: number): number {
  const safePrior = ensureProbability(priorProbability, 0.1);
  const safeHazard = Number.isFinite(dailyHazard) ? Math.max(0, dailyHazard) : 0;
  const boundedDays = Math.max(0, Number.isFinite(days) ? days : 0);
  const survival = Math.exp(-safeHazard * boundedDays);
  const hazardCumulative = 1 - survival;
  const safeImpulse = Number.isFinite(impulse) ? impulse : 0;
  const impulseBonus = clamp(Math.max(0, safeImpulse) * 0.22, 0, 0.28);
  const result = safePrior + (1 - safePrior) * hazardCumulative + impulseBonus;
  return ensureProbability(result, safePrior);
}

function deriveScenarioFeatures(
  family: Signal["family"],
  magnitude: number,
  direction: Signal["direction"],
): Record<string, number> {
  if (family === "resolutionWording") {
    return {
      qualifiesYesProbability: direction === "pro_yes" ? clamp(magnitude * 0.97, 0.12, 0.99) : clamp(magnitude * 0.12, 0, 0.25),
      deescalationScore: direction === "pro_yes" ? clamp(magnitude * 0.92, 0.15, 0.99) : clamp(magnitude * 0.28, 0, 0.45),
      announcementScore: direction === "pro_yes" ? clamp(magnitude * 0.98, 0.18, 0.99) : clamp(magnitude * 0.18, 0, 0.35),
    };
  }

  if (family === "forcePosture" || family === "strategicFlights" || family === "diplomaticChannels") {
    return {
      trueEndSupport: clamp(magnitude * 0.94, 0.1, 0.98),
      deescalationScore: clamp(magnitude * 0.88, 0.08, 0.98),
    };
  }

  if (family === "leaderSchedule") {
    return {
      trueEndSupport: direction === "pro_yes" ? clamp(magnitude * 0.72, 0.08, 0.82) : clamp(magnitude * 0.36, 0.04, 0.48),
      deescalationScore: direction === "pro_yes" ? clamp(magnitude * 0.62, 0.06, 0.76) : clamp(magnitude * 0.22, 0.02, 0.34),
      announcementScore: direction === "pro_yes" ? clamp(magnitude * 0.58, 0.05, 0.72) : clamp(magnitude * 0.16, 0.02, 0.28),
    };
  }

  if (family === "proxyTempo" || family === "pizzaIndex") {
    return {
      trueEndSupport: direction === "pro_yes" ? clamp(magnitude * 0.55, 0, 0.6) : 0,
      deescalationScore: direction === "pro_yes" ? clamp(magnitude * 0.45, 0, 0.55) : 0,
    };
  }

  return {
    announcementScore: clamp(magnitude * 0.62, 0, 0.75),
    deescalationScore: clamp(magnitude * 0.58, 0, 0.75),
  };
}

function cloneSignal(signal: Signal): Signal {
  return {
    ...signal,
    derivedFeatures: { ...signal.derivedFeatures },
    rawPayload: { ...signal.rawPayload },
  };
}
