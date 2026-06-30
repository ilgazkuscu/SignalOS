import { runNewsPollCycle } from "../apps/web/src/lib/timeline/live-news";

async function main() {
  const result = await runNewsPollCycle();
  const summary = {
    generatedAt: new Date().toISOString(),
    events: result.events.length,
    sources: result.sourceCoverage.length,
    liveSources: result.sourceCoverage.filter((source) => source.status === "live").length,
    failingSources: result.sourceCoverage.filter((source) => source.status === "error").length,
    freshness: result.freshness,
  };
  console.log(JSON.stringify(summary, null, 2));
}

void main();
