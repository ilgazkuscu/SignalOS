export type ShowcaseStatus = "changed" | "read";

export type ShowcaseNewsItem = {
  id: string;
  date: string;
  timeLabel: string;
  headline: string;
  status: ShowcaseStatus;
  deltaPts: number;
  why: string;
  modelProb: number;
  polymarketProb: number;
};

const baseModelProb = 61.6;

// modelProb is derived as baseModelProb plus the running sum of deltaPts.
// Edit deltaPts or baseModelProb, then update modelProb to keep the path explicit for the demo.
export const showcaseNews: ShowcaseNewsItem[] = [
  {
    id: "step-1",
    date: "Jun 30",
    timeLabel: "Jun 30 08:00",
    headline: "Trump says objective achieved, peace possible",
    status: "changed",
    deltaPts: 9.0,
    why: "Read and evaluated as peace framing; raised the chance of a June 30 resolution.",
    modelProb: baseModelProb + 9.0,
    polymarketProb: 52.0,
  },
  {
    id: "step-2",
    date: "Jun 30",
    timeLabel: "Jun 30 10:30",
    headline: "White House says operations paused while diplomacy proceeds",
    status: "changed",
    deltaPts: -18.6,
    why: "Read and evaluated as unclear official wording; reduced confidence in a clean resolution.",
    modelProb: baseModelProb + 9.0 - 18.6,
    polymarketProb: 50.0,
  },
  {
    id: "step-3",
    date: "Jun 30",
    timeLabel: "Jun 30 13:10",
    headline: "Muscat talks scheduled",
    status: "changed",
    deltaPts: 6.0,
    why: "Read and evaluated as diplomacy news; added a credible path toward agreement.",
    modelProb: baseModelProb + 9.0 - 18.6 + 6.0,
    polymarketProb: 58.0,
  },
  {
    id: "step-4",
    date: "Jun 30",
    timeLabel: "Jun 30 19:15",
    headline: "Official explicit end statement",
    status: "read",
    deltaPts: 0,
    why: "Read and saved as context; no material move for current thresholds.",
    modelProb: baseModelProb + 9.0 - 18.6 + 6.0,
    polymarketProb: 89.0,
  },
  {
    id: "step-5",
    date: "Jun 30",
    timeLabel: "Jun 30 20:46",
    headline: "U.S. and Iran to Meet with Mediators in Qatar",
    status: "changed",
    deltaPts: 34.6,
    why: "Read and evaluated as diplomatic channel; strong move toward resolution.",
    modelProb: baseModelProb + 9.0 - 18.6 + 6.0 + 34.6,
    polymarketProb: 94.0,
  },
  {
    id: "step-6",
    date: "Jun 30",
    timeLabel: "Jun 30 21:10",
    headline: "After U.S.-Iran War, Oman Is Said to Propose Strait of Hormuz Fee Plan",
    status: "read",
    deltaPts: 0,
    why: "Read and evaluated as diplomacy news; no material move after the Qatar update.",
    modelProb: baseModelProb + 9.0 - 18.6 + 6.0 + 34.6,
    polymarketProb: 94.0,
  },
  {
    id: "step-7",
    date: "Jul 1",
    timeLabel: "Jul 1 00:49",
    headline: "Foreign Affairs publishes post-conflict analysis",
    status: "read",
    deltaPts: 0,
    why: "Read as source analysis; useful context, but no material move for current thresholds.",
    modelProb: 92.6,
    polymarketProb: 94.0,
  },
];
