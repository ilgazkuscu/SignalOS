import { describe, expect, it } from "vitest";
import { model2ProbabilityForBucket } from "@/app/dashboard/dashboard-tab";
import type { FamilyBucketRow } from "@/modules/markets";

const baseBucket: FamilyBucketRow = {
  id: "May 31",
  label: "May 31",
  role: "Medium horizon",
  deadlineAt: "2026-05-31T23:59:59-04:00",
  outcome: "YES by date",
  weight: 0.2,
  modelProbability: 0.35,
  marketProbability: 0.245,
  gap: 0.105,
};

const model2Phase = {
  phase: 1,
  posterior: [0.55, 0.2, 0.12, 0.07, 0.04, 0.02],
  features: {
    p3_trigger: 0,
    p4_trigger: 0,
    trump_two_weeks_pattern: 0,
  },
  time_to_kinetic: {
    within_24h: 0.012,
    within_72h: 0.021,
    within_7d: 0.036,
    within_30d: 0.064,
  },
};

describe("model2ProbabilityForBucket", () => {
  it("derives Model2 probabilities for non-Iran active ladders too", () => {
    const probability = model2ProbabilityForBucket(baseBucket, model2Phase, Date.parse("2026-05-15T12:00:00.000Z"));

    expect(probability).not.toBeNull();
    expect(probability ?? 0).toBeGreaterThan(0.2);
    expect(probability ?? 1).toBeLessThan(0.6);
  });

  it("does not invent Model2 values for buckets without deadlines", () => {
    expect(model2ProbabilityForBucket({ ...baseBucket, deadlineAt: undefined }, model2Phase)).toBeNull();
  });
});
