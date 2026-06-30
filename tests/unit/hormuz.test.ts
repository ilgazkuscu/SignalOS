import { describe, expect, it } from "vitest";
import { deriveHormuzModelByDate, orderHormuzMarkets } from "@/lib/hormuz";
import type { PolymarketEventMarket } from "@/lib/polymarket/fetcher";

function market(label: string): PolymarketEventMarket {
  return {
    id: label,
    slug: label.toLowerCase().replaceAll(" ", "-"),
    question: label,
    label,
    eventSlug: "trump-announces-us-blockade-of-hormuz-lifted-by",
    yesPrice: 0.25,
    clobTokenIds: ["yes", "no"],
    active: true,
    closed: false,
    endDate: "2026-04-30T00:00:00.000Z",
  };
}

describe("Hormuz helpers", () => {
  it("orders every current ladder bucket and restores configured deadlines", () => {
    const ordered = orderHormuzMarkets([
      market("May 31"),
      market("April 15"),
      market("June 30"),
      market("May 22"),
      market("May 15"),
    ]);

    expect(ordered.map((item) => item.label)).toEqual(["April 15", "May 15", "May 22", "May 31", "June 30"]);
    expect(ordered.find((item) => item.label === "April 15")?.endDate).toBe("2026-04-15T23:59:59-04:00");
    expect(ordered.find((item) => item.label === "June 30")?.endDate).toBe("2026-06-30T23:59:59-04:00");
  });

  it("derives model values for the expanded active Hormuz ladder", () => {
    const modelByLabel = deriveHormuzModelByDate({
      "apr-15": 0.07,
      "apr-21": 0.14,
      "apr-30": 0.25,
      "may-31": 0.51,
      "jun-30": 0.62,
    });

    expect(Object.keys(modelByLabel)).toEqual(["April 15", "April 17", "April 19", "April 30", "May 15", "May 22", "May 31", "June 30"]);
    expect(modelByLabel["May 15"]).toBeGreaterThan(modelByLabel["April 30"]);
    expect(modelByLabel["June 30"]).toBeGreaterThan(modelByLabel["May 31"]);
  });
});
