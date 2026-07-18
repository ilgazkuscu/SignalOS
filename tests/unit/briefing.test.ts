import { describe, expect, it } from "vitest";
import { buildEliteBriefMarkdown } from "@/modules/intelligence";
import type { TimelinePayload } from "@/lib/types/domain";

const timeline: TimelinePayload = {
  generatedAt: "2026-04-10T16:00:00.000Z",
  fixtureMode: true,
  freshness: {
    cacheAgeMs: 0,
    refreshIntervalMs: 60000,
    usingCachedData: false,
  },
  events: [],
  clusters: [
    {
      id: "cluster-1",
      canonicalTitle: "US considers new sanctions on Iran-linked energy exports",
      summary: "Officials are considering sanctions.",
      occurredAt: "2026-04-10T15:00:00.000Z",
      sourceCount: 2,
      sources: [
        {
          id: "source-1",
          sourceId: "nyt",
          sourceName: "nyt",
          headline: "US weighs Iran sanctions",
          url: "https://example.com/story",
          occurredAt: "2026-04-10T15:00:00.000Z",
          confidence: 0.8,
        },
      ],
      category: "proxy_escalation",
      importance: "high",
      confidenceScore: 0.82,
      signalStage: "developing",
      whyItMatters: "Energy markets may price supply risk.",
      whatToWatch: "Watch for official confirmation within 24-48h.",
    },
  ],
  newsSummary: [
    {
      id: "summary-1",
      headlineSummary: "US considers new sanctions on Iran-linked energy exports",
      whyItMatters: "Energy markets may price supply risk.",
      watchItem: "Watch for official confirmation within 24-48h.",
      implicationTag: "Defense / energy implication",
      importance: "High",
      status: "Developing",
      confidenceScore: 0.82,
      sourceCount: 2,
      sources: [],
    },
  ],
  narrativeTrends: [
    {
      id: "narrative-1",
      title: "Regional escalation risk",
      category: "proxy_escalation",
      latestAt: "2026-04-10T15:00:00.000Z",
      sourceCount: 2,
      clusterCount: 1,
      velocityScore: 0.74,
      label: "accelerating",
      interpretation: "The narrative is gaining speed; watch for official confirmation.",
    },
  ],
  sourceCoverage: [],
};

describe("elite brief markdown", () => {
  it("exports executive summary, narrative tracker, and clickable sources", () => {
    const markdown = buildEliteBriefMarkdown(timeline);

    expect(markdown).toContain("# Elite Brief: Iran Ops Endgame Engine");
    expect(markdown).toContain("US considers new sanctions");
    expect(markdown).toContain("Regional escalation risk");
    expect(markdown).toContain("[nyt](https://example.com/story)");
    expect(markdown).toContain("not financial advice");
  });
});
