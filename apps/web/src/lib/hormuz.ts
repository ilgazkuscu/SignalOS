import { hormuzClosureFamily } from "@/modules/markets";
import type { PolymarketEventMarket } from "@/lib/polymarket/fetcher";

export const HORMUZ_EVENT_SLUG = "trump-announces-us-blockade-of-hormuz-lifted-by";
export const HORMUZ_LABEL_ORDER = ["April 15", "April 17", "April 19", "April 30", "May 15", "May 22", "May 31", "June 30"] as const;

export type HormuzLabel = (typeof HORMUZ_LABEL_ORDER)[number];

export const HORMUZ_MODEL_ADJUSTMENTS: Record<HormuzLabel, number> = {
  "April 15": -0.04,
  "April 17": -0.03,
  "April 19": -0.015,
  "April 30": 0.04,
  "May 15": 0.06,
  "May 22": 0.07,
  "May 31": 0.08,
  "June 30": 0.09,
};

const HORMUZ_DEADLINE_BY_LABEL = Object.fromEntries(
  hormuzClosureFamily.bucketOrder.map((bucket) => [bucket.id, bucket.resolvesAt]),
) as Partial<Record<HormuzLabel, string | undefined>>;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(left: number, right: number, t: number) {
  return left + (right - left) * t;
}

export function deriveHormuzModelByDate(modelByContract: Record<string, number>) {
  const apr15 = modelByContract["apr-15"] ?? 0.5;
  const apr21 = modelByContract["apr-21"] ?? apr15;
  const apr30 = modelByContract["apr-30"] ?? apr21;
  const may31 = modelByContract["may-31"] ?? apr30;
  const jun30 = modelByContract["jun-30"] ?? may31;
  const raw = {
    "April 15": apr15,
    "April 17": lerp(apr15, apr21, 2 / 6),
    "April 19": lerp(apr15, apr21, 4 / 6),
    "April 30": apr30,
    "May 15": lerp(apr30, may31, 15 / 31),
    "May 22": lerp(apr30, may31, 22 / 31),
    "May 31": may31,
    "June 30": jun30,
  } satisfies Record<HormuzLabel, number>;
  let floor = 0;

  return HORMUZ_LABEL_ORDER.reduce<Record<string, number>>((accumulator, label) => {
    const adjusted = clamp(raw[label] + HORMUZ_MODEL_ADJUSTMENTS[label]);
    floor = Math.max(floor, adjusted);
    accumulator[label] = floor;
    return accumulator;
  }, {});
}

export function orderHormuzMarkets(markets: PolymarketEventMarket[]) {
  const ordered: PolymarketEventMarket[] = [];

  for (const label of HORMUZ_LABEL_ORDER) {
    const market = markets.find((item) => item.label === label);
    if (!market) continue;

    ordered.push({
      ...market,
      endDate: HORMUZ_DEADLINE_BY_LABEL[label] ?? market.endDate,
    });
  }

  return ordered;
}
