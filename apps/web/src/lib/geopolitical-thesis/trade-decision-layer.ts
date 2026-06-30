import type { TradeDecision, TradeDecisionInput } from "@/lib/geopolitical-thesis/types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function buildTradeDecisionLayer(
  inputs: TradeDecisionInput[],
  confidence: number,
): TradeDecision[] {
  return inputs.map((input) => {
    const expectedValueYes = input.thesis_probability - input.market_yes_price;
    const expectedValueNo = (1 - input.thesis_probability) - (1 - input.market_yes_price);
    const maxEdge = Math.max(expectedValueYes, expectedValueNo);
    const edge = expectedValueYes > 0.03 ? "long_yes" : expectedValueNo > 0.03 ? "long_no" : "watch";
    const sizeScore = clamp01(Math.abs(maxEdge) * 4.2 * confidence);
    const positionSize =
      edge === "watch" ? "zero" :
      sizeScore >= 0.55 ? "large" :
      sizeScore >= 0.3 ? "medium" :
      "small";

    return {
      market_id: input.market_id,
      market_label: input.market_label,
      market_yes_price: Number(input.market_yes_price.toFixed(4)),
      thesis_probability: Number(input.thesis_probability.toFixed(4)),
      expected_value_yes: Number(expectedValueYes.toFixed(4)),
      expected_value_no: Number(expectedValueNo.toFixed(4)),
      edge,
      confidence: Number(confidence.toFixed(4)),
      position_size: positionSize,
      rationale:
        edge === "watch"
          ? "No clear expected-value edge after confidence scaling."
          : `${edge === "long_yes" ? "YES" : "NO"} side has the stronger expected-value edge after comparing thesis probability with market price and scaling by thesis confidence.`,
    };
  });
}
