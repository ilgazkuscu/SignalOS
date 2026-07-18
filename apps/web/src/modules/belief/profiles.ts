import { demoFixtures } from "@/lib/fixtures/demo";
import type { WeightProfile, WeightProfileKey } from "@/lib/types/domain";

export function getWeightProfile(key: WeightProfileKey): WeightProfile {
  return demoFixtures.weightProfiles.find((profile) => profile.key === key) ?? demoFixtures.weightProfiles[1];
}

export function listWeightProfiles(): WeightProfile[] {
  return demoFixtures.weightProfiles;
}
