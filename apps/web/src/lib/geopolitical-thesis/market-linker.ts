import type { MarketLink, Scenario } from "@/lib/geopolitical-thesis/types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function linkMarkets(
  scenarios: Scenario[],
  markets: Array<{ id: string; label: string }>
): MarketLink[] {
  return markets.map((market) => {
    const lower = market.label.toLowerCase();
    const frontBucket = /apr|week|soon|near/.test(lower);
    const dependency = scenarios
      .filter((scenario) =>
        frontBucket
          ? ["S2", "S5", "S6"].includes(scenario.id)
          : ["S3", "S4", "S1"].includes(scenario.id),
      )
      .sort((left, right) => right.probability - left.probability)
      .slice(0, 3);
    const relevance = clamp01(
      dependency.reduce((sum, scenario) => sum + scenario.probability, 0) * (frontBucket ? 1 : 0.82),
    );

    return {
      market_id: market.id,
      relevance_score: Number(relevance.toFixed(4)),
      rationale: dependency.length
        ? `Most relevant because ${dependency.map((scenario) => scenario.label).join(", ")} currently explain this market's geopolitical path.`
        : "No strong scenario dependency is currently established.",
      scenario_dependency: dependency.map((scenario) => scenario.id),
    };
  });
}
