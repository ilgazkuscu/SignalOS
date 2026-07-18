import type { TimelinePayload } from "@/lib/types/domain";

export function buildEliteBriefMarkdown(timeline: TimelinePayload) {
  const generatedAt = new Date(timeline.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines = [
    "# Elite Brief: Iran Ops Endgame Engine",
    "",
    `Generated: ${generatedAt}`,
    `Mode: ${timeline.fixtureMode ? "fixture-backed demo" : "live/fallback hybrid"}`,
    "",
    "## Executive Summary",
    "",
    ...timeline.newsSummary.flatMap((item, index) => [
      `${index + 1}. ${item.headlineSummary}`,
      `   - Why it matters: ${item.whyItMatters}`,
      `   - Watch next: ${item.watchItem}`,
      `   - Status: ${item.status}; confidence ${(item.confidenceScore * 100).toFixed(0)}%; ${item.sourceCount} source${item.sourceCount === 1 ? "" : "s"}.`,
    ]),
    "",
    "## Narrative Tracker",
    "",
    ...timeline.narrativeTrends.flatMap((trend) => [
      `- ${trend.title}: ${trend.label} (${(trend.velocityScore * 100).toFixed(0)} velocity)`,
      `  - ${trend.interpretation}`,
      `  - Coverage: ${trend.clusterCount} cluster${trend.clusterCount === 1 ? "" : "s"}, ${trend.sourceCount} source${trend.sourceCount === 1 ? "" : "s"}.`,
    ]),
    "",
    "## Source-Backed Coverage",
    "",
    ...timeline.clusters.slice(0, 8).flatMap((cluster) => [
      `### ${cluster.canonicalTitle}`,
      "",
      `- Stage: ${cluster.signalStage}; confidence ${(cluster.confidenceScore * 100).toFixed(0)}%; category ${cluster.category.replaceAll("_", " ")}.`,
      `- Why it matters: ${cluster.whyItMatters}`,
      `- What to watch: ${cluster.whatToWatch}`,
      ...cluster.sources.slice(0, 5).map((source) =>
        source.url ? `- Source: [${source.sourceName}](${source.url}) - ${source.headline}` : `- Source: ${source.sourceName} - ${source.headline}`,
      ),
      "",
    ]),
    "## Limitations",
    "",
    "- This is decision-support research, not financial advice.",
    "- Early signals are watchlist triggers, not confirmed facts.",
    "- Fixture-backed outputs are useful for product demonstration but not historical performance claims.",
    "",
  ];

  return lines.join("\n");
}
