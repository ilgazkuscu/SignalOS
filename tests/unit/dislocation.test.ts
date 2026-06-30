import { describe, expect, it } from "vitest";
import { demoFixtures } from "../../fixtures/demo";
import { buildCrossBucketDislocations } from "@/lib/decision/cross-bucket";

describe("cross-bucket dislocation analytics", () => {
  it("computes adjacent-bucket curve dislocations and flags the strongest one", () => {
    const rows = buildCrossBucketDislocations({
      markets: demoFixtures.markets,
      marketSnapshots: demoFixtures.marketSnapshots,
      modelYesByContract: {
        "apr-15": 0.09,
        "apr-21": 0.19,
        "apr-30": 0.31,
        "may-31": 0.46,
        "jun-30": 0.58,
      },
    });

    expect(rows.length).toBe(demoFixtures.markets.length - 1);
    expect(rows.filter((row) => row.strongest)).toHaveLength(1);
    expect(typeof rows[0].curveDislocation).toBe("number");
  });
});
