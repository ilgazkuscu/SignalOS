"use client";

import React from "react";
import Image from "next/image";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardPayload, ReplayPayload } from "@/lib/types/domain";
import type {
  EventMarketHistoryPoint,
  LiveMarketHistoryPoint,
  PolymarketEventMarket,
} from "@/lib/polymarket/fetcher";
import { deriveHormuzModelByDate, HORMUZ_LABEL_ORDER } from "@/lib/hormuz";
import { formatDateTimeEt, relativeTimeFrom } from "@/lib/utils/time";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function signedPct(value: number) {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded} pts`;
}

function toneForGap(gap: number) {
  if (gap >= 0.08) return "text-[var(--color-positive-text)]";
  if (gap <= -0.08) return "text-[var(--color-danger-text)]";
  return "text-[var(--color-text)]";
}

function sourceIconUrl(url?: string) {
  if (!url) return null;

  try {
    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`;
  } catch {
    return null;
  }
}

function latestReplayAtOrBefore<T extends { ts: number }>(rows: T[], targetTs: number) {
  let latest: T | null = null;

  for (const row of rows) {
    if (row.ts <= targetTs) latest = row;
    else break;
  }

  return latest;
}

function buildPathRows<
  TPoint extends { timestamp: string; yesPrice: number; label?: string },
  TReplay extends { ts: number; modelYes: number }
>(history: TPoint[], replayRows: TReplay[]) {
  return history
    .map((point) => {
      const pointTs = new Date(point.timestamp).getTime();
      const modelRow = latestReplayAtOrBefore(replayRows, pointTs);
      if (!modelRow) return null;

      const marketYes = Number((point.yesPrice * 100).toFixed(2));
      const modelYes = Number((modelRow.modelYes * 100).toFixed(2));
      const gap = Number((modelYes - marketYes).toFixed(2));

      return {
        label: point.label ?? formatDateTimeEt(point.timestamp),
        marketYes,
        modelYes,
        gap,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function gapBarColor(gap: number) {
  return gap >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)";
}

function chartTooltipName(name: string) {
  if (name === "marketYes") return "Market YES";
  if (name === "modelYes") return "Model YES";
  return "Gap";
}

export function MarketSnapshotsView({
  data: initialData,
  liveApr15History: initialLiveApr15History,
  replay: initialReplay,
  hormuzMarkets: initialHormuzMarkets,
  liveHormuzHistoryByLabel: initialLiveHormuzHistoryByLabel,
}: {
  data: DashboardPayload;
  liveApr15History: LiveMarketHistoryPoint[];
  replay: ReplayPayload;
  hormuzMarkets: PolymarketEventMarket[];
  liveHormuzHistoryByLabel: Record<string, EventMarketHistoryPoint[]>;
}) {
  const [data, setData] = React.useState(initialData);
  const [liveApr15History, setLiveApr15History] = React.useState(initialLiveApr15History);
  const [replay, setReplay] = React.useState(initialReplay);
  const [hormuzMarkets, setHormuzMarkets] = React.useState(initialHormuzMarkets);
  const [liveHormuzHistoryByLabel, setLiveHormuzHistoryByLabel] = React.useState(initialLiveHormuzHistoryByLabel);

  React.useEffect(() => setData(initialData), [initialData]);
  React.useEffect(() => setLiveApr15History(initialLiveApr15History), [initialLiveApr15History]);
  React.useEffect(() => setReplay(initialReplay), [initialReplay]);
  React.useEffect(() => setHormuzMarkets(initialHormuzMarkets), [initialHormuzMarkets]);
  React.useEffect(() => setLiveHormuzHistoryByLabel(initialLiveHormuzHistoryByLabel), [initialLiveHormuzHistoryByLabel]);

  React.useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS ?? 30_000);
    const refreshSnapshots = async () => {
        try {
          const response = await fetch(`/api/snapshots?ts=${Date.now()}`, { cache: "no-store" });
          if (!response.ok) return;
          const next = (await response.json()) as {
            data: DashboardPayload;
            replay: ReplayPayload;
            liveApr15History: LiveMarketHistoryPoint[];
            hormuzMarkets: PolymarketEventMarket[];
            liveHormuzHistoryByLabel: Record<string, EventMarketHistoryPoint[]>;
          };
          setData(next.data);
          setReplay(next.replay);
          setLiveApr15History(next.liveApr15History);
          setHormuzMarkets(next.hormuzMarkets);
          setLiveHormuzHistoryByLabel(next.liveHormuzHistoryByLabel);
        } catch {
          // Keep the last good payload.
        }
    };

    void refreshSnapshots();
    const timer = window.setInterval(() => {
      void refreshSnapshots();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, []);

  const iranRows = data.markets
    .map((market) => {
      const snapshot = data.marketSnapshots.find((item) => item.marketId === market.id);
      const discrepancy = data.discrepancy.find((item) => item.marketId === market.id);
      const thesis = data.theses.find((item) => item.marketId === market.id);
      const sizing = data.sizingGuidance.find((item) => item.marketId === market.id);

      return {
        family: "Iran Ops",
        id: market.id,
        label: market.label,
        marketYes: snapshot?.yesPrice ?? 0,
        modelYes: discrepancy?.modelYes ?? 0,
        gap: discrepancy?.gap ?? 0,
        catalyst: thesis?.wordingCatalyst ?? "Awaiting explicit qualifying language.",
        invalidation: thesis?.invalidation ?? "New official escalation language would weaken the case.",
        sizingTier: sizing?.tier ?? "Observe",
      };
    })
    .sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap));

  const iranModelByContract = Object.fromEntries(
    data.discrepancy.map((entry) => [entry.marketId, entry.modelYes]),
  ) as Record<string, number>;
  const hormuzModelByLabel = deriveHormuzModelByDate(iranModelByContract);
  const hormuzRows = HORMUZ_LABEL_ORDER
    .map((label) => {
      const market = hormuzMarkets.find((item) => item.label === label);
      if (!market) return null;

      const modelYes = hormuzModelByLabel[label] ?? 0.5;
      const gap = modelYes - market.yesPrice;

      return {
        family: "Hormuz Lift",
        id: market.id,
        label,
        marketYes: market.yesPrice,
        modelYes,
        gap,
        catalyst: "A direct Trump / White House / Pentagon statement explicitly ending the blockade.",
        invalidation: "Shipping normalizing without official lift language does not qualify.",
        sizingTier: Math.abs(gap) >= 0.12 ? "Press" : Math.abs(gap) >= 0.06 ? "Lean" : "Observe",
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const boardRows = [...iranRows, ...hormuzRows].sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap));
  const topRow = boardRows[0] ?? iranRows[0];
  const topOpportunity = data.opportunities?.[0];
  const topAlert = data.alerts?.[0];
  const updatedAt = formatDateTimeEt(data.generatedAt);
  const updatedAgo = relativeTimeFrom(data.generatedAt, Date.now());
  const sourceCards = (data.sourceCoverage ?? []).slice(0, 6);
  const health = data.healthSummary;

  const replayRowsIran = replay.history
    .map((entry) => ({
      ts: new Date(entry.asOf).getTime(),
      modelYes: entry.belief.yesProbabilityByContract["apr-15"],
    }))
    .sort((left, right) => left.ts - right.ts);

  const replayRowsHormuz = replay.history
    .map((entry) => {
      const modelByLabel = deriveHormuzModelByDate(entry.belief.yesProbabilityByContract as Record<string, number>);
      return {
        ts: new Date(entry.asOf).getTime(),
        modelYes: modelByLabel["May 31"] ?? 0.5,
      };
    })
    .sort((left, right) => left.ts - right.ts);

  const apr15HistoryRows = buildPathRows(liveApr15History, replayRowsIran);
  const hormuzMay31HistoryRows = buildPathRows(
    (liveHormuzHistoryByLabel["May 31"] ?? []).map((point) => ({ ...point, label: formatDateTimeEt(point.timestamp) })),
    replayRowsHormuz,
  );

  const pipelineSteps = [
    {
      title: "1. Pull",
      body: "Official feeds, live news, and Polymarket market ladders are pulled into one real-time intake layer.",
    },
    {
      title: "2. Normalize",
      body: "Every update becomes a timestamped event with source weight, wording risk, and contract relevance.",
    },
    {
      title: "3. Score",
      body: "The model translates event flow into deadline-aware probabilities rather than one generic geopolitical view.",
    },
    {
      title: "4. Compare",
      body: "Each contract family gets a live market line, a model line, and a signed gap so divergence is obvious.",
    },
  ];

  return (
    <div
      data-theme="light"
      className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      <section className="grid gap-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6 md:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Live Multi-Market Snapshot
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="font-condensed text-4xl font-semibold leading-tight text-[var(--color-text)] sm:text-5xl">
              One site, two political bets, one live model-versus-market board.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">
              The website now reads as a reusable event-market intelligence product: Iran operations on one side,
              Hormuz blockade-lift on the other, both updated live from Polymarket and the same signal engine.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SnapshotStat label="Updated" value={updatedAt} />
            <SnapshotStat label="Families" value="2 live bets" tone="positive" />
            <SnapshotStat label="Data Mode" value={data.fixtureMode ? "Fixture + live" : "Live / fallback"} />
            <SnapshotStat
              label="Largest Gap"
              value={topRow ? `${topRow.family} ${topRow.label} ${signedPct(topRow.gap)}` : "n/a"}
              tone={topRow && topRow.gap >= 0 ? "positive" : "negative"}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">What To Say</div>
            <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
              {topOpportunity?.label ?? "We run the same geopolitical engine across multiple tradable contracts."}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              {topOpportunity?.rationale ??
                "The board tracks a repeatable system that prices adjacent geopolitical policy-reversal contracts."}
            </p>
          </div>
          <div className="mt-5 text-sm leading-6 text-[var(--color-text-muted)]">
            {topAlert
              ? `${topAlert.title}: ${topAlert.body}`
              : "No urgent alert is active right now. Both ladders are updating and ready for a clean walkthrough."}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <FamilyTermCard
          kicker="Bet One"
          title="Iran operations end ladder"
          body="The original family stays here as the near-term policy-end benchmark."
          rows={iranRows.map((row) => ({
            label: row.label.replace(/^By\s+/i, ""),
            marketYes: Math.round(row.marketYes * 100),
            modelYes: Math.round(row.modelYes * 100),
            gap: Math.round(row.gap * 100),
          }))}
          footer={`Live market source: ${data.marketDataSource ?? "Polymarket / fallback"}`}
        />
        <FamilyTermCard
          kicker="Bet Two"
          title="Hormuz blockade-lift ladder"
          body="The second family uses the same event engine, re-mapped into a statement-driven blockade-lift contract set."
          rows={hormuzRows.map((row) => ({
            label: row.label,
            marketYes: Math.round(row.marketYes * 100),
            modelYes: Math.round(row.modelYes * 100),
            gap: Math.round(row.gap * 100),
          }))}
          footer="Live market source: Polymarket event ladder"
        />
      </section>

      <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Board</div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Current model versus market table</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Both contract families are sorted together by absolute gap, so the most investable disagreement floats to the top.
          </p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Family</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Bucket</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Market</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Model</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Gap</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Sizing</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3">Catalyst</th>
              </tr>
            </thead>
            <tbody>
              {boardRows.map((row) => (
                <tr key={`${row.family}-${row.id}`} className="align-top">
                  <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">
                    {row.family}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold">
                    {row.label}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                    {pct(row.marketYes)}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                    {pct(row.modelYes)}
                  </td>
                  <td className={`border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold ${toneForGap(row.gap)}`}>
                    {signedPct(row.gap)}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                    {row.sizingTier}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-0 py-4 text-sm leading-6 text-[var(--color-text-muted)]">
                    {row.catalyst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PathChartCard
          kicker="Replay Path"
          title="Iran Apr 15"
          body="Real Polymarket April 15 CLOB history aligned to our replayed model path."
          rows={apr15HistoryRows}
          stats={[
            { label: "Bucket", value: "April 15" },
            { label: "Source", value: "Polymarket CLOB API" },
            { label: "Points", value: String(apr15HistoryRows.length), tone: "positive" },
          ]}
        />
        <PathChartCard
          kicker="Replay Path"
          title="Hormuz May 31"
          body="The second bet now has its own live market path and a mapped model replay on the same timestamps."
          rows={hormuzMay31HistoryRows}
          stats={[
            { label: "Bucket", value: "May 31" },
            { label: "Source", value: "Polymarket CLOB API" },
            { label: "Points", value: String(hormuzMay31HistoryRows.length), tone: "positive" },
          ]}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Data Path</div>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">How live data gets to us</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            The pitch is no longer “here is an Iran graph.” It is “here is the reusable pipe from raw events to multi-contract pricing.”
          </p>
          <div className="mt-5 grid gap-3">
            {pipelineSteps.map((step) => (
              <div key={step.title} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="text-sm font-semibold text-[var(--color-text)]">{step.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SnapshotStat label="Market Feed" value={data.marketDataSource ?? "unknown"} />
            <SnapshotStat label="Updates Stored" value={String(health?.updatesStored ?? 0)} />
            <SnapshotStat label="Healthy Sources" value={String(health?.healthySources ?? 0)} tone="positive" />
            <SnapshotStat
              label="Sources In Error"
              value={String(health?.unhealthySources ?? 0)}
              tone={(health?.unhealthySources ?? 0) > 0 ? "negative" : "neutral"}
            />
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Source Pictures</div>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">Live sources feeding both boards</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
              These are the same source cards backing the signal layer and the replay logic.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {sourceCards.map((source) => {
              const icon = sourceIconUrl(source.url);
              return (
                <div key={source.key} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="flex items-start gap-3">
                    {icon ? (
                      <Image
                        src={icon}
                        alt={`${source.label} icon`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-[8px] border border-[var(--color-border)] bg-white/90 p-1"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] text-xs font-semibold text-[var(--color-text-muted)]">
                        {source.label.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-[var(--color-text)]">{source.label}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{source.status}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{source.note}</p>
                      <div className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
                        {source.latestAt ? `Latest: ${formatDateTimeEt(source.latestAt)}` : "Latest update pending"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Why It Matters</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <li>It now looks like a platform, not a single manually curated political chart.</li>
            <li>Both bets are tied to crisp official-language resolution rules, so the model story is explainable.</li>
            <li>Live-on-load prices keep every contract family ready for a fresh decision review.</li>
          </ul>
        </div>
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">What Changes The Board</div>
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            {topRow?.catalyst ?? "No catalyst loaded."}
          </p>
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            Invalidation: {topRow?.invalidation ?? "No invalidation loaded."}
          </p>
          <p className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">Snapshot generated {updatedAgo}.</p>
        </div>
      </section>
    </div>
  );
}

function FamilyTermCard({
  kicker,
  title,
  body,
  rows,
  footer,
}: {
  kicker: string;
  title: string;
  body: string;
  rows: Array<{ label: string; marketYes: number; modelYes: number; gap: number }>;
  footer: string;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">{kicker}</div>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
      </div>
      <div className="mt-6 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
            <CartesianGrid stroke="var(--color-grid)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              formatter={(value: number, name: string) => [
                name === "gap" ? `${value > 0 ? "+" : ""}${value} pts` : `${value}%`,
                name === "marketYes" ? "Market" : name === "modelYes" ? "Model" : "Gap",
              ]}
            />
            <Legend />
            <Bar dataKey="marketYes" name="Market" radius={[4, 4, 0, 0]} fill="var(--color-chart-market)" />
            <Bar dataKey="modelYes" name="Model" radius={[4, 4, 0, 0]} fill="var(--color-chart-model)" />
            <Line
              type="monotone"
              dataKey="gap"
              name="Gap"
              stroke="var(--color-text)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--color-text)" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm leading-6 text-[var(--color-text-muted)]">{footer}</div>
    </section>
  );
}

function PathChartCard({
  kicker,
  title,
  body,
  rows,
  stats,
}: {
  kicker: string;
  title: string;
  body: string;
  rows: Array<{ label: string; marketYes: number; modelYes: number; gap: number }>;
  stats: Array<{ label: string; value: string; tone?: "positive" | "negative" | "neutral" }>;
}) {
  return (
    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">{kicker}</div>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <SnapshotStat key={stat.label} label={stat.label} value={stat.value} tone={stat.tone ?? "neutral"} />
        ))}
      </div>
      <div className="mt-6 h-[340px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-grid)" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis yAxisId="prob" tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <YAxis
              yAxisId="gap"
              orientation="right"
              tickLine={false}
              axisLine={false}
              domain={[-100, 100]}
              tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}pt`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === "gap" ? `${value > 0 ? "+" : ""}${value} pts` : `${value}%`,
                chartTooltipName(name),
              ]}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Bar yAxisId="gap" dataKey="gap" name="Gap" barSize={18}>
              {rows.map((row) => (
                <Cell key={`${title}-${row.label}-gap`} fill={gapBarColor(row.gap)} />
              ))}
            </Bar>
            <Line yAxisId="prob" type="monotone" dataKey="marketYes" name="Market YES" stroke="var(--color-chart-market)" strokeWidth={3} dot={false} />
            <Line yAxisId="prob" type="monotone" dataKey="modelYes" name="Model YES" stroke="var(--color-chart-model)" strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SnapshotStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const tones = {
    positive: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
    negative: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
    neutral: "bg-[var(--color-panel)] text-[var(--color-text)]",
  };

  return (
    <div className={`rounded-[8px] border border-[var(--color-border)] px-4 py-3 ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold sm:text-base">{value}</div>
    </div>
  );
}
