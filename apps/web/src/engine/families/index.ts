import { hormuzClosureFamily } from "@/engine/families/hormuz-closure";
import { iranOpsEndgameFamily } from "@/engine/families/iran-ops-endgame";

export const registeredFamilies = [iranOpsEndgameFamily, hormuzClosureFamily];

function unresolvedBucketCount(family: (typeof registeredFamilies)[number], now: Date) {
  return family.bucketOrder.filter((bucket) => {
    if (bucket.closedAt && new Date(bucket.closedAt).getTime() <= now.getTime()) return false;
    if (!bucket.resolvesAt) return false;
    return new Date(bucket.resolvesAt).getTime() >= now.getTime();
  }).length;
}

function nextDeadlineTs(family: (typeof registeredFamilies)[number], now: Date) {
  return family.bucketOrder
    .filter((bucket) => {
      if (bucket.closedAt && new Date(bucket.closedAt).getTime() <= now.getTime()) return false;
      return bucket.resolvesAt && new Date(bucket.resolvesAt).getTime() >= now.getTime();
    })
    .map((bucket) => new Date(bucket.resolvesAt as string).getTime())
    .sort((left, right) => left - right)[0] ?? Number.POSITIVE_INFINITY;
}

export function getDefaultFamily(now: Date = new Date()) {
  return registeredFamilies
    .slice()
    .sort((left, right) => {
      const unresolvedDelta = unresolvedBucketCount(right, now) - unresolvedBucketCount(left, now);
      if (unresolvedDelta !== 0) return unresolvedDelta;

      const deadlineDelta = nextDeadlineTs(left, now) - nextDeadlineTs(right, now);
      if (deadlineDelta !== 0) return deadlineDelta;

      return left.displayName.localeCompare(right.displayName);
    })[0];
}

export function getDefaultFamilyId(now: Date = new Date()) {
  return getDefaultFamily(now).id;
}

export function getFamilyById(id: string | null | undefined) {
  return registeredFamilies.find((family) => family.id === id) ?? getDefaultFamily();
}
