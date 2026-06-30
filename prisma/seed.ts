import { demoFixtures } from "../fixtures/demo";

async function main() {
  console.log("Seed preview for fixture mode");
  console.log(JSON.stringify({
    markets: demoFixtures.markets.length,
    sources: demoFixtures.sources.length,
    sourceEvents: demoFixtures.sourceEvents.length,
    signals: demoFixtures.signals.length,
    scenarios: demoFixtures.scenarios.length,
    weightProfiles: demoFixtures.weightProfiles.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
