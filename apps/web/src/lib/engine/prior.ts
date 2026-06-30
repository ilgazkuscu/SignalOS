import { differenceInCalendarDays } from "date-fns";
import type { MarketDefinition, PriorBeliefCurve } from "@/lib/types/domain";
import { clamp } from "@/lib/utils/math";

interface PriorInput {
  markets: MarketDefinition[];
  now: Date;
  activeHostilities: number;
  ceasefireStatus: number;
  formalWindDownTendency: number;
  baselineConflictDurationDays: number;
}

export function buildPriorCurve(input: PriorInput): PriorBeliefCurve {
  const realDeescalationByDate = {} as PriorBeliefCurve["realDeescalationByDate"];
  const formalAnnouncementByDate = {} as PriorBeliefCurve["formalAnnouncementByDate"];

  for (const market of input.markets) {
    const daysToDeadline = Math.max(
      1,
      differenceInCalendarDays(new Date(market.deadlineAt), input.now),
    );

    const durationFactor = clamp(daysToDeadline / input.baselineConflictDurationDays, 0.08, 1.2);
    const ceasefireBoost = input.ceasefireStatus * 0.22;
    const hostilitiesDrag = input.activeHostilities * 0.25;
    const explicitWordingFriction = market.resolutionCriteria.clearEndLanguageRequired ? 0.08 : 0.02;

    const realEnd = clamp(0.16 + durationFactor * 0.34 + ceasefireBoost - hostilitiesDrag);
    const formalEnd = clamp(realEnd * input.formalWindDownTendency - explicitWordingFriction);

    realDeescalationByDate[market.id] = realEnd;
    formalAnnouncementByDate[market.id] = formalEnd;
  }

  return {
    asOf: input.now.toISOString(),
    realDeescalationByDate,
    formalAnnouncementByDate,
    quietFadeProbability: clamp(0.38 + input.activeHostilities * 0.12 - input.formalWindDownTendency * 0.08),
    announcementLagMeanDays: 5.5,
    baselineHostilities: input.activeHostilities,
    notes: [
      "Prior curve increases with deadline distance but discounts formal announcement odds due to resolution friction.",
      "Formal announcement prior is intentionally lower than real de-escalation prior to reflect quiet fade risk.",
    ],
  };
}
