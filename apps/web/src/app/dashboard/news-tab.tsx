"use client";

import React from "react";
import { NewsItem } from "@/components/news-item";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";

export function NewsTab({
  family,
  output,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const visibleNews = showAll ? output.news : output.news.filter((item) => item.relevanceScore >= family.news.minScore);

  return (
    <div className="space-y-5">
      <Panel title="News Feed" subtitle="Global ingest, filtered to the selected family’s entities and keywords.">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[var(--color-text-muted)]">
            Keywords: {family.news.keywords.join(", ")}
          </div>
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            {showAll ? "Hide low relevance" : "Show all"}
          </button>
        </div>
        {visibleNews.length ? (
          <div className="grid gap-3">
            {visibleNews.map((item) => (
              <NewsItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState text={output.emptyStates.news ?? "News ingest not configured for this family."} />
        )}
      </Panel>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
      {text}
    </div>
  );
}
