import { NextResponse } from "next/server";
import { getDueSources } from "@/lib/news/scheduler";
import { readNewsStore } from "@/lib/news/store";
import { getNewsSourceRegistry } from "@/lib/news/source-registry";

export async function GET() {
  const store = await readNewsStore();
  const dueSources = getDueSources(store.sources);
  const sources = getNewsSourceRegistry().map((source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    pollIntervalSeconds: source.pollIntervalSeconds,
    state: store.sources[source.id] ?? null,
    nextPollDueAt: dueSources.find((item) => item.id === source.id)?.nextPollDueAt,
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    healthySources: sources.filter((source) => (source.state?.failureCount ?? 0) === 0).length,
    unhealthySources: sources.filter((source) => (source.state?.failureCount ?? 0) > 0).length,
    sources,
    updatesStored: store.updates.length,
    modelRefreshRuns: store.modelRefreshRuns.slice(0, 10),
  });
}
