import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyHeaderStrip } from "@/components/family-header-strip";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";
import { hormuzClosureFamily } from "@/modules/markets";

const baseOutput: FamilyEngineOutput = {
  familyId: "hormuz-closure",
  displayName: "Hormuz Closure",
  shortThesis: "Will Trump or the U.S. formally announce the blockade is lifted?",
  description: "Tracks the statement-driven Polymarket ladder.",
  generatedAt: "2026-05-15T00:00:00.000Z",
  aggregateModelProbability: 0.31,
  aggregateMarketProbability: 0.27,
  gap: 0.04,
  horizonLabel: "May 31",
  primaryBucketLabel: "May 31",
  primaryBucketModelProbability: 0.31,
  primaryBucketMarketProbability: 0.24,
  primaryBucketGap: 0.07,
  buckets: [
    {
      id: "May 31",
      label: "May 31",
      role: "Medium horizon",
      slug: "will-donald-trump-announce-that-the-united-states-blockade-of-the-strait-of-hormuz-has-been-lifted-by-may-31-2026-313-388-459-589",
      outcome: "YES by date",
      weight: 0.2,
      modelProbability: 0.31,
      marketProbability: 0.24,
      gap: 0.07,
    },
  ],
  closedBuckets: [],
  replay: [],
  signals: [],
  signalTimeline: [],
  signalMatrix: [],
  news: [],
  playbook: null,
  emptyStates: {},
};

describe("FamilyHeaderStrip", () => {
  it("links the Hormuz ladder to its live event page", () => {
    const html = renderToStaticMarkup(React.createElement(FamilyHeaderStrip, { family: hormuzClosureFamily, output: baseOutput }));

    expect(html).toContain('href="https://polymarket.com/event/trump-announces-us-blockade-of-hormuz-lifted-by"');
    expect(html).not.toContain('href="https://polymarket.com/event/will-donald-trump-announce');
  });

  it("falls back to market URLs when only a market slug is configured", () => {
    const fallbackFamily: MarketFamily = {
      ...hormuzClosureFamily,
      polymarketEventUrl: undefined,
    };
    const html = renderToStaticMarkup(React.createElement(FamilyHeaderStrip, { family: fallbackFamily, output: baseOutput }));

    expect(html).toContain(
      'href="https://polymarket.com/market/will-donald-trump-announce-that-the-united-states-blockade-of-the-strait-of-hormuz-has-been-lifted-by-may-31-2026-313-388-459-589"',
    );
    expect(html).not.toContain('href="https://polymarket.com/event/will-donald-trump-announce');
  });
});
