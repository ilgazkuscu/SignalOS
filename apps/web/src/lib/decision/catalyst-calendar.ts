import type { CatalystEvent, MarketDefinition, SourceEvent } from "@/lib/types/domain";

function weekendWindows(markets: MarketDefinition[]): CatalystEvent[] {
  const seen = new Set<string>();
  return markets
    .filter((market) => market.marketStatus !== "closed")
    .flatMap((market) => {
      const deadline = new Date(market.deadlineAt);
      const saturday = new Date(deadline);
      saturday.setDate(deadline.getDate() - ((deadline.getDay() + 1) % 7));
      const id = `weekend-${saturday.toISOString().slice(0, 10)}`;
      if (seen.has(id)) return [];
      seen.add(id);
      return [
        {
          id,
          title: `Weekend / thin-liquidity window near ${market.label}`,
          startAt: saturday.toISOString(),
          eventType: "weekend_window",
          confidence: "inferred",
          relevance: "medium",
          linkedMarkets: markets
            .filter((item) => item.marketStatus !== "closed")
            .filter((item) => Math.abs(new Date(item.deadlineAt).getTime() - deadline.getTime()) < 45 * 24 * 3_600_000)
            .map((item) => item.id),
          note: "Weekend windows can amplify headline sensitivity and reduce market depth.",
          sourceLabel: "calendar_inference",
          fixtureBacked: true,
        } satisfies CatalystEvent,
      ];
    });
}

export function buildCatalystCalendar({
  markets,
  sourceEvents,
  nowIso,
}: {
  markets: MarketDefinition[];
  sourceEvents: SourceEvent[];
  nowIso: string;
}): CatalystEvent[] {
  const eventDerived = sourceEvents
    .filter((event) => /talks|briefing|statement|speech|muscat|white house|pentagon/i.test(`${event.title} ${event.body}`))
    .slice(0, 8)
    .map((event) => ({
      id: `cat-${event.id}`,
      title: event.title,
      startAt: event.occurredAt,
      eventType: /talks|muscat|diplomat/i.test(`${event.title} ${event.body}`)
        ? "diplomatic_meeting"
        : /speech|truth social|remarks/i.test(`${event.title} ${event.body}`)
          ? "speech"
          : "press_briefing",
      confidence: event.status === "verified" ? "confirmed" : "inferred",
      relevance: event.confidence > 0.8 ? "high" : "medium",
      linkedMarkets: markets
        .filter((market) => market.marketStatus !== "closed" && new Date(market.deadlineAt) >= new Date(nowIso))
        .slice(0, 3)
        .map((market) => market.id),
      note: event.body,
      sourceLabel: event.sourceId,
      fixtureBacked: event.rawPayload?.url?.toString().startsWith("fixture://") ?? false,
    } satisfies CatalystEvent));

  const deadlines = markets.filter((market) => market.marketStatus !== "closed").map((market) => ({
    id: `deadline-${market.id}`,
    title: `${market.label} contract deadline`,
    startAt: market.deadlineAt,
    eventType: "deadline",
    confidence: "confirmed",
    relevance: "high",
    linkedMarkets: [market.id],
    note: "Prediction-market resolution window closes at this deadline.",
    sourceLabel: "market_rule",
    fixtureBacked: true,
  } satisfies CatalystEvent));

  return [...eventDerived, ...deadlines, ...weekendWindows(markets)]
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 14);
}
