import type { BeliefState, MarketDefinition, SourceEvent, ThesisCard } from "@/lib/types/domain";

function latestMatchingEvent(events: SourceEvent[], matcher: RegExp) {
  return events
    .filter((event) => matcher.test(`${event.title} ${event.body} ${event.tags.join(" ")}`.toLowerCase()))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
}

export function buildThesisCards({
  markets,
  sourceEvents,
  belief,
}: {
  markets: MarketDefinition[];
  sourceEvents: SourceEvent[];
  belief: BeliefState;
}): ThesisCard[] {
  const bullish = latestMatchingEvent(sourceEvents, /talks|reduced sortie|tanker|drawdown|concluded|ceasefire|muscat/);
  const bearish = latestMatchingEvent(sourceEvents, /proxy|strike|retaliat|ready|resume|buildup/);
  const wording = latestMatchingEvent(sourceEvents, /operations concluded|pause|official|statement|truth social|white house/);

  return markets.map((market) => {
    const decomposition = belief.decompositionByContract[market.id];
    const provisional = !bullish || !wording;

    return {
      marketId: market.id,
      bullishCatalyst:
        bullish?.title ??
        "Insufficient structured evidence — thesis box is provisional.",
      bearishCatalyst:
        bearish?.title ??
        "A fresh escalation signal, casualty event, or force-posture rebuild would flip the thesis quickly.",
      wordingCatalyst:
        wording?.title ??
        "A direct official statement that operations have concluded would be the clearest wording catalyst.",
      invalidation:
        decomposition.announcementGivenEnd < 0.4
          ? "If wording stays ambiguous while readiness language persists, the edge should be downgraded."
          : "If the current wording path weakens or forces return to alert posture, invalidate the thesis.",
      provisional,
    } satisfies ThesisCard;
  });
}
