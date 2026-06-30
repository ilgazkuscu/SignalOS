"use client";

import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorBoundary } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import { StatPill } from "@/components/stat-pill";
import type { DashboardPayload, ThesisCard } from "@/lib/types/domain";
import { parsePolymarketSlugMap } from "@/lib/polymarket/fetcher";
import { formatDateTimeEt, relativeTimeFrom } from "@/lib/utils/time";

export function DashboardView({ data: initialData }: { data: DashboardPayload }) {
  const [data, setData] = React.useState(initialData);
  const [decisionFilter, setDecisionFilter] = React.useState<"all" | "trade" | "watch" | "no_trade">("all");
  const [refreshState, setRefreshState] = React.useState<"idle" | "refreshing" | "error">("idle");
  const [snapshotSelection, setSnapshotSelection] = React.useState<string>("all");
  const snapshotChartRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refreshDashboard = React.useCallback(async () => {
    setRefreshState("refreshing");
    try {
      const response = await fetch(`/api/dashboard?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      const next = (await response.json()) as DashboardPayload;
      setData(next);
      setRefreshState("idle");
    } catch {
      setRefreshState("error");
    }
  }, []);

  React.useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS ?? 30_000);
    void refreshDashboard();
    const timer = window.setInterval(() => {
      void refreshDashboard();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [refreshDashboard]);

  const sortedDiscrepancy = [...data.discrepancy].sort(
    (left, right) => Math.abs(right.gap) - Math.abs(left.gap),
  );
  const largestGap = sortedDiscrepancy[0];
  const lastUpdatedLabel = formatDateTimeEt(data.generatedAt);
  const bestEv = data.expectedValueRanking[0];
  const topAlert = data.alerts?.[0];
  const topOpportunity = data.opportunities?.[0];
  const topSignal = data.latestSignals[0];
  const healthSummary = data.healthSummary;
  const sourceCoverage = data.sourceCoverage ?? [];
  const newModel = data.newModel;
  const failingSources = sourceCoverage.filter((source) => source.status === "error").slice(0, 2);
  const staleSources = sourceCoverage.filter((source) => source.status === "stale").slice(0, 2);
  const topPositiveDrivers = data.currentBelief.topPositiveDrivers.slice(0, 3);
  const topNegativeDrivers = data.currentBelief.topNegativeDrivers.slice(0, 3);
  const filteredDecisions = React.useMemo(
    () =>
      data.decisions
        .slice()
        .sort((left, right) => right.tradeScore - left.tradeScore)
        .filter((decision) => {
          if (decisionFilter === "all") return true;
          if (decisionFilter === "trade") return decision.stance === "LONG_YES" || decision.stance === "LONG_NO";
          if (decisionFilter === "watch") return decision.stance === "WATCH";
          return decision.stance === "NO_TRADE";
        }),
    [data.decisions, decisionFilter],
  );
  const decisionCounts = {
    all: data.decisions.length,
    trade: data.decisions.filter((decision) => decision.stance === "LONG_YES" || decision.stance === "LONG_NO").length,
    watch: data.decisions.filter((decision) => decision.stance === "WATCH").length,
    no_trade: data.decisions.filter((decision) => decision.stance === "NO_TRADE").length,
  };
  const marketRows = data.markets.map((market) => {
    const snapshot = data.marketSnapshots.find((item) => item.marketId === market.id);
    const gap = data.discrepancy.find((item) => item.marketId === market.id)?.gap ?? 0;
    const decision = data.decisions.find((item) => item.marketId === market.id);
    const thesis = data.theses.find((item) => item.marketId === market.id);

    return {
      market,
      snapshot,
      gap,
      decision,
      thesis,
      modelYes: data.currentBelief.yesProbabilityByContract[market.id] ?? 0,
      wordingRisk: decision?.components.wordingRiskPenalty ?? data.wordingRiskAssessment.score,
    };
  });
  const polymarketSlugMap = React.useMemo(
    () => parsePolymarketSlugMap(process.env.NEXT_PUBLIC_POLYMARKET_MARKET_SLUG_MAP),
    [],
  );
  const modelVsMarketSeries = marketRows.map(({ market, snapshot, gap, modelYes }) => ({
    label: market.label.replace(/^By\s+/i, ""),
    modelYes: roundPct(modelYes),
    marketYes: roundPct(snapshot?.yesPrice ?? 0),
    gap: roundPct(gap),
  }));
  const snapshotDownloadRows = React.useMemo(() => {
    return marketRows.map(({ market, snapshot, gap, decision, thesis, modelYes, wordingRisk }) => ({
      marketId: market.id,
      marketLabel: market.label,
      polymarketUrl: resolvePolymarketUrl(market.id, polymarketSlugMap, market.polymarketUrl),
      deadlineAt: market.deadlineAt,
      generatedAt: data.generatedAt,
      modelYes,
      marketYes: snapshot?.yesPrice ?? 0,
      gap,
      wordingRisk,
      stance: decision?.stance ?? "UNSET",
      tradeScore: decision?.tradeScore ?? null,
      expectedValuePerUnit: data.expectedValueRanking.find((item) => item.marketId === market.id)?.evPerUnit ?? null,
      sizingTier: data.sizingGuidance.find((item) => item.marketId === market.id)?.tier ?? null,
      catalyst: thesis?.wordingCatalyst ?? null,
      invalidation: thesis?.invalidation ?? null,
    }));
  }, [data.expectedValueRanking, data.generatedAt, data.sizingGuidance, marketRows, polymarketSlugMap]);
  const activeSnapshotRows = snapshotSelection === "all"
    ? snapshotDownloadRows
    : snapshotDownloadRows.filter((row) => row.marketId === snapshotSelection);
  const activeSnapshotLabel =
    snapshotSelection === "all"
      ? "Whole board"
      : snapshotDownloadRows.find((row) => row.marketId === snapshotSelection)?.marketLabel ?? "Selected contract";
  const exportSnapshot = React.useCallback(
    (format: "json" | "csv") => {
      const stamp = data.generatedAt.replace(/[:.]/g, "-");
      const baseName =
        snapshotSelection === "all"
          ? `market-snapshot-${stamp}`
          : `market-snapshot-${snapshotSelection}-${stamp}`;
      const payload =
        format === "json"
          ? JSON.stringify(
              {
                generatedAt: data.generatedAt,
                selection: snapshotSelection,
                rows: activeSnapshotRows,
              },
              null,
              2,
            )
          : toCsv(activeSnapshotRows);
      const blob = new Blob([payload], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${baseName}.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    },
    [activeSnapshotRows, data.generatedAt, snapshotSelection],
  );
  const downloadSvgChartAsJpg = React.useCallback(async () => {
    const svg = snapshotChartRef.current?.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render chart image."));
      });
      image.src = svgUrl;
      await imageLoaded;

      const bounds = svg.getBoundingClientRect();
      const width = Math.max(900, Math.round(bounds.width || 900));
      const height = Math.max(420, Math.round(bounds.height || 420));
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.scale(2, 2);
      context.fillStyle = "#0b1020";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const jpgUrl = canvas.toDataURL("image/jpeg", 0.94);
      const anchor = document.createElement("a");
      anchor.href = jpgUrl;
      anchor.download = `market-snapshot-chart-${data.generatedAt.replace(/[:.]/g, "-")}.jpg`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, [data.generatedAt]);
  const exportInteractiveSnapshot = React.useCallback(() => {
    const stamp = data.generatedAt.replace(/[:.]/g, "-");
    const title = snapshotSelection === "all" ? "Market Snapshot Dashboard" : `${activeSnapshotLabel} Dashboard`;
    const html = buildInteractiveSnapshotHtml({
      title,
      generatedAt: data.generatedAt,
      selection: snapshotSelection,
      rows: activeSnapshotRows,
      chartRows:
        snapshotSelection === "all"
          ? modelVsMarketSeries
          : modelVsMarketSeries.filter((row) =>
              snapshotDownloadRows.some(
                (item) => item.marketId === snapshotSelection && item.marketLabel.replace(/^By\s+/i, "") === row.label,
              ),
            ),
    });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      snapshotSelection === "all"
        ? `market-snapshot-dashboard-${stamp}.html`
        : `market-snapshot-dashboard-${snapshotSelection}-${stamp}.html`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [activeSnapshotLabel, activeSnapshotRows, data.generatedAt, modelVsMarketSeries, snapshotDownloadRows, snapshotSelection]);
  const summaryTone = largestGap.gap >= 0 ? "positive" : "negative";
  const summaryText =
    largestGap.gap >= 0
      ? `The model is more constructive than the market in ${largestGap.marketId}.`
      : `The market is richer than the model in ${largestGap.marketId}.`;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="space-y-5">
        <ErrorBoundary title="Analyst Overview">
          <Panel
            title="Dashboard Overview"
            subtitle="One-screen summary of what matters, what to do, and where the market still disagrees."
          >
            <div className="grid gap-3 md:grid-cols-4">
              <StatPill
                label="Biggest Gap"
                value={`${largestGap.gap >= 0 ? "+" : "-"}${Math.abs(largestGap.gap).toFixed(1)} pts`}
                tone={summaryTone}
              />
              <StatPill
                label="Wording Risk"
                value={`${roundPct(data.currentBelief.wordingRiskScore)}%`}
                tone={data.currentBelief.wordingRiskScore > 0.45 ? "negative" : "neutral"}
              />
              <StatPill
                label="Market Dislocation"
                value={`${roundPct(data.currentBelief.marketDislocationScore)}%`}
                tone={data.currentBelief.marketDislocationScore > 0.35 ? "positive" : "neutral"}
              />
              <StatPill
                label="Announcement Hazard"
                value={`${roundPct(data.currentBelief.dailyAnnouncementHazard)}%/day`}
                tone="neutral"
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InsightCard
                title="Bottom line"
                body={`${summaryText} Current wording risk is ${roundPct(data.currentBelief.wordingRiskScore)}%, so price alone is not enough.`}
              />
              <InsightCard
                title="Recommended focus"
                tone="warning"
                body={
                  topOpportunity
                    ? `${topOpportunity.label}: ${topOpportunity.rationale}`
                    : `${largestGap.marketId} shows the clearest disagreement to review next.`
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1 font-medium">
                Last updated: {lastUpdatedLabel}
              </div>
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
              >
                {refreshState === "refreshing" ? "Refreshing..." : "Refresh now"}
              </button>
              {refreshState === "error" ? (
                <div className="rounded-full border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-1 font-semibold text-[var(--color-danger-text)]">
                  Auto-refresh failed; showing last good snapshot
                </div>
              ) : null}
              <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-[var(--color-text-muted)]">
                {data.marketDataSource ?? "fixture"} market data • {data.fixtureMode ? "fixture-backed" : "live"} signals
              </div>
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Trade Decisions">
          <Panel
            title="Trade Decisions"
            subtitle="A short ranked list of where to act, watch, or pass."
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "All"],
                  ["trade", "Trade Only"],
                  ["watch", "Watch Only"],
                  ["no_trade", "No Trade"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDecisionFilter(key)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      decisionFilter === key
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    {label} ({decisionCounts[key]})
                  </button>
                ))}
              </div>
              <div className="text-sm text-[var(--color-text-muted)]">Sorted by trade score · Last updated {lastUpdatedLabel}</div>
            </div>
            <div className="space-y-4">
              {filteredDecisions.map((decision) => {
                const market = data.markets.find((item) => item.id === decision.marketId);
                const thesis = data.theses.find((item) => item.marketId === decision.marketId);
                const sizing = data.sizingGuidance.find((item) => item.marketId === decision.marketId);
                return (
                  <div key={decision.marketId} className="rounded-2xl border border-[var(--color-border)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{market?.label}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge tone={decision.stance === "LONG_YES" ? "positive" : decision.stance === "LONG_NO" ? "negative" : decision.stance === "WATCH" ? "warning" : "neutral"}>
                            {decision.stance.replace("_", " ")}
                          </Badge>
                          {thesis?.provisional ? <Badge tone="warning">provisional thesis</Badge> : null}
                          {decision.components.wordingRiskPenalty > 0.35 ? <Badge tone="negative">high wording risk</Badge> : null}
                          {decision.components.liquidityQuality < 0.4 ? <Badge tone="warning">low liquidity</Badge> : null}
                        </div>
                        <p className="mt-3 text-sm text-[var(--color-text-muted)]">{decision.rationale[0]}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <StatPill label="Trade score" value={`${roundPct(decision.tradeScore)}%`} tone={decision.stance.startsWith("LONG") ? "positive" : decision.stance === "NO_TRADE" ? "negative" : "neutral"} />
                        <StatPill label="Sizing" value={sizing?.tier ?? "AVOID"} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <MetricChip label="Gap" value={`${(decision.components.gapSize * 100).toFixed(0)}%`} />
                      <MetricChip label="Confidence" value={`${(decision.components.confidence * 100).toFixed(0)}%`} />
                      <MetricChip label="Catalyst" value={`${(decision.components.catalystNearness * 100).toFixed(0)}%`} />
                      <MetricChip label="Wording penalty" value={`${(decision.components.wordingRiskPenalty * 100).toFixed(0)}%`} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DecisionList title="Why now" items={decision.rationale.slice(0, 3)} />
                      <DecisionList title="Key risks / invalidation" items={[...decision.invalidation, ...decision.warnings]} />
                    </div>
                    {thesis && market ? <EditableThesisBox thesis={thesis} marketLabel={market.label} nowMs={new Date(data.generatedAt).getTime()} /> : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Market Snapshot">
          <Panel
            title="Market Snapshot"
            subtitle="Each contract in one row: price, model view, action, and the main thing making it hard."
          >
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">Model vs Market</div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      One chart for the whole board, so the disagreement is visible at a glance.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--color-chart-model)]" />
                      Model YES
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--color-chart-market)]" />
                      Market YES
                    </span>
                  </div>
                </div>
                <div ref={snapshotChartRef} className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={modelVsMarketSeries} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        unit="%"
                      />
                      <Tooltip content={<ModelMarketTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="modelYes"
                        name="Model YES"
                        stroke="var(--color-chart-model)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="marketYes"
                        name="Market YES"
                        stroke="var(--color-chart-market)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">Download Snapshot</div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Export the current board or a single contract with model, market, gap, and trade context.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadSvgChartAsJpg()}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                    >
                      Download JPG
                    </button>
                    <button
                      type="button"
                      onClick={exportInteractiveSnapshot}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                    >
                      Interactive HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => exportSnapshot("json")}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                    >
                      Download JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => exportSnapshot("csv")}
                      className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                    >
                      Download CSV
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Trackable view</span>
                      <select
                        value={snapshotSelection}
                        onChange={(event) => setSnapshotSelection(event.target.value)}
                        className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)]"
                      >
                        <option value="all">Whole board</option>
                        {snapshotDownloadRows.map((row) => (
                          <option key={row.marketId} value={row.marketId}>
                            {row.marketLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <MetricChip label="Rows" value={String(activeSnapshotRows.length)} />
                      <MetricChip label="Selection" value={activeSnapshotLabel} />
                      <MetricChip label="Generated" value={formatDateTimeEt(data.generatedAt)} />
                    </div>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-muted)] p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Preview</div>
                    <div className="mt-3 max-h-40 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-xs text-[var(--color-text-muted)]">
                      <pre className="whitespace-pre-wrap break-words font-mono">
                        {JSON.stringify(activeSnapshotRows.slice(0, 2), null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              {marketRows.map(({ market, snapshot, gap, decision, thesis, modelYes, wordingRisk }) => (
                <div key={market.id} className="rounded-2xl border border-[var(--color-border)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{market.label}</h3>
                        {decision ? (
                          <Badge tone={decision.stance === "LONG_YES" ? "positive" : decision.stance === "LONG_NO" ? "negative" : decision.stance === "WATCH" ? "warning" : "neutral"}>
                            {decision.stance.replace("_", " ")}
                          </Badge>
                        ) : null}
                        <a
                          href={resolvePolymarketUrl(market.id, polymarketSlugMap, market.polymarketUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        >
                          Open on Polymarket
                        </a>
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Deadline {formatDateTimeEt(market.deadlineAt)}</p>
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        {thesis?.wordingCatalyst ?? decision?.rationale[0] ?? "No thesis note yet."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <StatPill label="Model" value={`${roundPct(modelYes)}%`} tone="positive" />
                      <StatPill label="Market" value={`${roundPct(snapshot?.yesPrice ?? 0)}%`} />
                      <StatPill label="Gap" value={`${gap >= 0 ? "+" : "-"}${Math.abs(gap * 100).toFixed(1)} pts`} tone={gap >= 0 ? "positive" : "negative"} />
                      <StatPill label="Wording risk" value={`${roundPct(wordingRisk)}%`} tone={wordingRisk > 0.45 ? "negative" : "neutral"} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </ErrorBoundary>
      </div>

      <div className="space-y-5">
        <ErrorBoundary title="Model 2">
          <Panel title="Model 2" subtitle="Geopolitical thesis engine: evidence, scenarios, and market translation.">
            {newModel ? (
              <div className="space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <StatPill label="Hypothesis confidence" value={`${roundPct(newModel.hypothesisConfidence)}%`} tone={newModel.hypothesisConfidence > 0.55 ? "positive" : "neutral"} />
                  <StatPill label="Contradiction penalty" value={`${roundPct(newModel.contradictionPenalty)}%`} tone={newModel.contradictionPenalty > 0.2 ? "negative" : "neutral"} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Freshness</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <MetricChip label="Live evidence" value={`${newModel.liveEvidenceCount}`} />
                      <MetricChip label="Signal evidence" value={`${newModel.signalEvidenceCount}`} />
                      <MetricChip label="Fixture evidence" value={`${newModel.fixtureEvidenceCount}`} />
                      <MetricChip label="Last live item" value={newModel.lastLiveEvidenceAt ? relativeTimeFrom(newModel.lastLiveEvidenceAt, new Date(data.generatedAt).getTime()) : "n/a"} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Read</div>
                    <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                      Dominant frame: <span className="font-medium text-[var(--color-text)]">{newModel.dominantFrame ?? "Unclear"}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                      Model 2 now leans on live timeline evidence first, then recent derived signals, and only uses fixture evidence as background context.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="text-sm font-semibold">Model 2 Narrative</div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{newModel.narrative.summary}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Hypotheses</div>
                    <div className="mt-3 space-y-2">
                      {newModel.hypotheses.slice(0, 3).map((hypothesis) => (
                        <div key={hypothesis.id} className="flex items-center justify-between gap-3 text-sm">
                          <span>{hypothesis.label}</span>
                          <span className="font-semibold">{roundPct(hypothesis.current_probability)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Scenarios</div>
                    <div className="mt-3 space-y-2">
                      {newModel.scenarios.slice(0, 3).map((scenario) => (
                        <div key={scenario.id} className="flex items-center justify-between gap-3 text-sm">
                          <span>{scenario.label}</span>
                          <span className="font-semibold">{roundPct(scenario.probability)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Trade Decision Layer</div>
                  <div className="mt-3 space-y-2">
                    {newModel.tradeDecisions.slice(0, 3).map((decision) => (
                      <div key={decision.market_id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span>{decision.market_label}</span>
                        <span className="text-[var(--color-text-muted)]">
                          {decision.edge} · {decision.position_size} · EV YES {signedPercent(decision.expected_value_yes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Model 2 Market Snapshot</div>
                  <div className="mt-3 space-y-3">
                    {newModel.marketAlignment?.map((alignment) => {
                      const dependency = newModel.marketLinks.find((link) => link.market_id === alignment.marketId);
                      const decision = newModel.tradeDecisions.find((item) => item.market_id === alignment.marketId);
                      if (!decision) return null;
                      return (
                        <div key={alignment.marketId} className="rounded-lg bg-[var(--color-surface-muted)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="font-medium text-sm text-[var(--color-text)]">{decision.market_label}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                              {decision.edge.replace("_", " ")} · {decision.position_size}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-4">
                            <MetricChip label="Thesis YES" value={`${roundPct(alignment.modelYes)}%`} />
                            <MetricChip label="Market YES" value={`${roundPct(alignment.marketYes)}%`} />
                            <MetricChip label="Gap" value={signedPercent(alignment.gap)} />
                            <MetricChip label="EV YES" value={signedPercent(decision.expected_value_yes)} />
                            <MetricChip label="Relevance" value={`${roundPct(dependency?.relevance_score ?? 0)}%`} />
                          </div>
                          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                            {dependency?.rationale ?? decision.rationale}
                          </p>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">How to Read Model 2</div>
                  <div className="mt-3 space-y-3 text-sm text-[var(--color-text-muted)]">
                    <p>
                      This new model is using a thesis pipeline: <span className="font-medium text-[var(--color-text)]">evidence → features → hypotheses → scenarios → market translation</span>.
                    </p>
                    <p>
                      It is still not a full settlement model, but it now updates off the <span className="font-medium text-[var(--color-text)]">live timeline, stored live updates, and recent signal state</span> instead of sitting mostly on fixture evidence.
                    </p>
                    <p>
                      Read it as a <span className="font-medium text-[var(--color-text)]">research model</span>, not as a final settlement model. The useful pieces right now are:
                    </p>
                    <div className="space-y-2">
                      <p><span className="font-medium text-[var(--color-text)]">Evidence:</span> what facts and inferences it is leaning on.</p>
                      <p><span className="font-medium text-[var(--color-text)]">Hypotheses:</span> which geopolitical explanations are strongest.</p>
                      <p><span className="font-medium text-[var(--color-text)]">Scenarios:</span> which strategic paths it thinks are most plausible.</p>
                      <p><span className="font-medium text-[var(--color-text)]">Trade layer:</span> rough EV versus current market price, after confidence scaling.</p>
                    </div>
                    <p>
                      The current engine is still the better source for <span className="font-medium text-[var(--color-text)]">date-bucket precision</span>. The new model is best used to understand <span className="font-medium text-[var(--color-text)]">why</span> the geopolitical thesis is shifting.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">New model output unavailable.</p>
            )}
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Live Ingestion">
          <Panel title="Live Ingestion" subtitle="Whether the news layer is healthy enough to trust right now.">
            <div className="grid gap-3 grid-cols-2">
              <StatPill label="Healthy" value={String(healthSummary?.healthySources ?? 0)} tone="positive" />
              <StatPill label="Failing" value={String(healthSummary?.unhealthySources ?? 0)} tone={(healthSummary?.unhealthySources ?? 0) > 0 ? "negative" : "neutral"} />
              <StatPill label="Due now" value={String(healthSummary?.dueNowSources ?? 0)} tone={(healthSummary?.dueNowSources ?? 0) > 0 ? "negative" : "neutral"} />
              <StatPill label="Stored updates" value={String(healthSummary?.updatesStored ?? 0)} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>
                Last model refresh:{" "}
                <span className="font-medium text-[var(--color-text)]">
                  {healthSummary?.lastModelRefreshAt ? formatDateTimeEt(healthSummary.lastModelRefreshAt) : "not yet"}
                </span>
              </p>
              <p>
                Last live event seen:{" "}
                <span className="font-medium text-[var(--color-text)]">
                  {sourceCoverage.find((source) => source.latestAt)?.latestAt
                    ? formatDateTimeEt(sourceCoverage.find((source) => source.latestAt)!.latestAt!)
                    : "none"}
                </span>
              </p>
            </div>
            {failingSources.length ? (
              <div className="mt-4 space-y-2">
                {failingSources.map((source) => (
                  <div key={source.key} className="rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-danger-text)]">{source.label}</div>
                    <p className="mt-1 text-sm text-[var(--color-danger-text)]">{source.note}</p>
                  </div>
                ))}
              </div>
            ) : staleSources.length ? (
              <div className="mt-4 space-y-2">
                {staleSources.map((source) => (
                  <div key={source.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{source.label}</div>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{source.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                No source is currently failing. The ingestion layer looks stable from the dashboard.
              </p>
            )}
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="What Needs Attention">
          <Panel title="What Needs Attention" subtitle="A short watchlist instead of a wall of diagnostics.">
            <div className="space-y-3">
              <AttentionCard
                title="Best opportunity"
                tone={bestEv && bestEv.evPerUnit > 0 ? "positive" : "neutral"}
                body={
                  topOpportunity
                    ? `${topOpportunity.label}. ${topOpportunity.rationale}`
                    : bestEv
                      ? `${bestEv.marketId} has the best EV at ${signedPercent(bestEv.evPerUnit)}.`
                      : "No opportunity currently clears the actionability filter."
                }
              />
              <AttentionCard
                title="Latest signal"
                body={
                  topSignal
                    ? `${topSignal.subtype} · ${topSignal.family} · ${relativeTimeFrom(topSignal.occurredAt, new Date(data.generatedAt).getTime())}. ${topSignal.rationale}`
                    : "No recent signals available."
                }
              />
              <AttentionCard
                title="Main warning"
                tone="warning"
                body={topAlert?.body ?? data.warnings[0] ?? "No active warning."}
              />
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Why The Model Leans This Way">
          <Panel title="Why The Model Leans This Way" subtitle="Top supporting and opposing drivers, trimmed to the ones worth reading.">
            <div className="space-y-4">
              <DriverSummary title="Supporting drivers" tone="positive" drivers={topPositiveDrivers} />
              <DriverSummary title="Holding it back" tone="negative" drivers={topNegativeDrivers} />
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Context">
          <Panel title="Context" subtitle="A few operating facts without the extra noise.">
            <div className="grid gap-3">
              <StatPill label="Top EV" value={bestEv ? `${bestEv.marketId} ${signedPercent(bestEv.evPerUnit)}` : "n/a"} tone={bestEv && bestEv.evPerUnit > 0 ? "positive" : "negative"} />
              <StatPill label="Regime" value={data.regimeState.label.replaceAll("_", " ")} />
              <StatPill label="Confidence" value={`${data.currentBelief.confidenceLabel} (${roundPct(data.currentBelief.confidenceScore)}%)`} />
              <StatPill label="Portfolio risk" value={data.portfolioSummary.totalRisk.toFixed(2)} tone={data.portfolioSummary.totalRisk > 1.5 ? "negative" : "neutral"} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>{data.executionRules[0] ? `${data.executionRules[0].marketId}: ${data.executionRules[0].enter ? "entry allowed" : "no entry"} · ${data.executionRules[0].rules[0]}` : "No execution rule loaded."}</p>
              <p>{data.calibrationSummary.limitations[0]}</p>
              {data.portfolioSummary.concentrationWarnings[0] ? <p>{data.portfolioSummary.concentrationWarnings[0]}</p> : null}
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="For Investors">
          <Panel title="For Investors" subtitle="A plain-language read on what Model 2 is seeing and why it matters.">
            {newModel ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <StatPill label="Dominant frame" value={newModel.dominantFrame ?? "Unclear"} tone="neutral" />
                  <StatPill label="Live evidence" value={`${newModel.liveEvidenceCount}`} tone={newModel.liveEvidenceCount >= 8 ? "positive" : "neutral"} />
                  <StatPill label="Fixture reliance" value={`${newModel.fixtureEvidenceCount}`} tone={newModel.fixtureEvidenceCount > newModel.liveEvidenceCount ? "negative" : "neutral"} />
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Model 2 is meant to answer a simple question: <span className="font-medium text-[var(--color-text)]">is the live geopolitical picture moving faster or slower than the market is pricing?</span>
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    Right now the model is reading <span className="font-medium text-[var(--color-text)]">{newModel.liveEvidenceCount} live timeline items</span> and <span className="font-medium text-[var(--color-text)]">{newModel.signalEvidenceCount} recent signal items</span>, while keeping <span className="font-medium text-[var(--color-text)]">{newModel.fixtureEvidenceCount} background fixture items</span> only as context.
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    The useful interpretation is not that the model knows the future. It is that the model is <span className="font-medium text-[var(--color-text)]">aggregating live diplomatic, strategic, and market signals into a transparent probability view</span>, then showing where that view most disagrees with the market.
                  </p>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    Investors should read this as a <span className="font-medium text-[var(--color-text)]">decision-support and monitoring layer</span>. The biggest current gaps matter most when they are backed by fresh live evidence rather than stale narrative carry-over.
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Largest Current Gaps</div>
                  <div className="mt-3 space-y-2">
                    {(newModel.marketAlignment ?? []).slice(0, 3).map((alignment) => (
                      <div key={alignment.marketId} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span>{alignment.marketLabel}</span>
                        <span className="text-[var(--color-text-muted)]">
                          Model {roundPct(alignment.modelYes)}% vs market {roundPct(alignment.marketYes)}% ({signedPercent(alignment.gap)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--color-text-muted)]">Investor summary is unavailable until Model 2 data loads.</div>
            )}
          </Panel>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) {
    return "marketId,marketLabel\n";
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const normalized =
      typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value);
    return `"${normalized.replaceAll('"', '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

const BUILT_IN_POLYMARKET_SLUGS = {
  "apr-15": "trump-announces-end-of-military-operations-against-iran-by-april-15th-962-364-677",
  "apr-21": "trump-announces-end-of-military-operations-against-iran-by-april-21st",
  "apr-30": "trump-announces-end-of-military-operations-against-iran-by-april-30th-753-882-164-769-641-926-643",
  "may-31": "trump-announces-end-of-military-operations-against-iran-by-may-31st-651-724-212-638",
  "jun-30": "trump-announces-end-of-military-operations-against-iran-by-june-30th-566-326-653-781-167-426-752-225-438",
} as const;

function resolvePolymarketUrl(marketId: string, slugMap: Partial<Record<string, string>>, explicitUrl?: string) {
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) return explicitUrl;
  const slug = slugMap[marketId] ?? BUILT_IN_POLYMARKET_SLUGS[marketId as keyof typeof BUILT_IN_POLYMARKET_SLUGS];
  return slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com";
}

function buildInteractiveSnapshotHtml({
  title,
  generatedAt,
  selection,
  rows,
  chartRows,
}: {
  title: string;
  generatedAt: string;
  selection: string;
  rows: Array<Record<string, unknown>>;
  chartRows: Array<{ label: string; modelYes: number; marketYes: number; gap: number }>;
}) {
  const escapedTitle = escapeHtml(title);
  const payload = JSON.stringify({ generatedAt, selection, rows, chartRows });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedTitle}</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #0b1020; color: #e8edf7; }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .grid { display: grid; gap: 16px; grid-template-columns: 1.2fr 0.8fr; }
    .panel { border: 1px solid #24304a; border-radius: 8px; background: #11182c; padding: 16px; }
    .meta { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    h1 { margin: 6px 0 0; font-size: 26px; }
    h2 { margin: 0 0 12px; font-size: 15px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .chip { border: 1px solid #24304a; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 8px; border-top: 1px solid #24304a; }
    th { color: #94a3b8; cursor: pointer; position: sticky; top: 0; background: #11182c; }
    .positive { color: #4ade80; }
    .negative { color: #fb7185; }
    .chart-wrap { position: relative; width: 100%; height: 320px; }
    .chart { width: 100%; height: 320px; display: block; }
    .legend { display: flex; gap: 16px; color: #94a3b8; font-size: 12px; margin-bottom: 12px; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 999px; margin-right: 6px; }
    .tooltip { position: absolute; pointer-events: none; min-width: 180px; max-width: 240px; padding: 10px 12px; border: 1px solid #24304a; border-radius: 8px; background: rgba(11, 16, 32, 0.96); color: #e8edf7; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.28); opacity: 0; transform: translateY(4px); transition: opacity .12s ease, transform .12s ease; }
    .tooltip.visible { opacity: 1; transform: translateY(0); }
    .tooltip .label { color: #94a3b8; text-transform: uppercase; letter-spacing: .12em; font-size: 11px; margin-bottom: 6px; }
    .tooltip .row { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
    .tooltip .row strong { font-weight: 700; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="panel">
      <div class="meta">Exported snapshot</div>
      <h1>${escapedTitle}</h1>
      <div class="chips">
        <div class="chip">Generated: ${escapeHtml(generatedAt)}</div>
        <div class="chip">Selection: ${escapeHtml(selection)}</div>
        <div class="chip">Rows: <span id="row-count"></span></div>
      </div>
    </div>
    <div class="grid" style="margin-top:16px;">
      <div class="panel">
        <h2>Model vs Market</h2>
        <div class="legend">
          <span><span class="swatch" style="background:#4f8cff"></span>Model YES</span>
          <span><span class="swatch" style="background:#f97316"></span>Market YES</span>
        </div>
        <div class="chart-wrap">
          <svg id="chart" class="chart" viewBox="0 0 760 320"></svg>
          <div id="chart-tooltip" class="tooltip"></div>
        </div>
      </div>
      <div class="panel">
        <h2>Quick read</h2>
        <div id="summary" style="display:grid; gap:10px;"></div>
      </div>
    </div>
    <div class="panel" style="margin-top:16px;">
      <h2>Sortable table</h2>
      <table>
        <thead><tr id="head-row"></tr></thead>
        <tbody id="body-rows"></tbody>
      </table>
    </div>
  </div>
  <script>
    const payload = ${payload};
    const rows = payload.rows.slice();
    const chartRows = payload.chartRows.slice();
    const headers = rows.length ? Object.keys(rows[0]) : [];
    let sortKey = "gap";
    let sortDir = "desc";

    document.getElementById("row-count").textContent = String(rows.length);

    function fmt(value, key) {
      if (value === null || value === undefined) return "";
      if (typeof value === "number" && /(Yes|gap|Risk|Score|Value)/i.test(key)) return (value * 100).toFixed(1) + "%";
      if (typeof value === "number") return String(value);
      return String(value);
    }

    function renderSummary() {
      const gaps = rows.map((row) => Number(row.gap ?? 0)).sort((a, b) => Math.abs(b) - Math.abs(a));
      const best = gaps[0] ?? 0;
      const avg = rows.length ? rows.reduce((sum, row) => sum + Math.abs(Number(row.gap ?? 0)), 0) / rows.length : 0;
      document.getElementById("summary").innerHTML = [
        '<div class="chip">Largest gap: ' + (best >= 0 ? '+' : '') + (best * 100).toFixed(1) + ' pts</div>',
        '<div class="chip">Average abs gap: ' + (avg * 100).toFixed(1) + ' pts</div>',
        '<div class="chip">Positive edges: ' + rows.filter((row) => Number(row.gap ?? 0) > 0).length + '</div>'
      ].join("");
    }

    function renderTable() {
      const head = document.getElementById("head-row");
      head.innerHTML = "";
      headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        th.onclick = () => {
          if (sortKey === header) sortDir = sortDir === "asc" ? "desc" : "asc";
          else { sortKey = header; sortDir = "desc"; }
          renderTable();
        };
        head.appendChild(th);
      });

      const body = document.getElementById("body-rows");
      body.innerHTML = "";
      const sorted = rows.slice().sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        if (typeof left === "number" && typeof right === "number") {
          return sortDir === "asc" ? left - right : right - left;
        }
        return sortDir === "asc"
          ? String(left ?? "").localeCompare(String(right ?? ""))
          : String(right ?? "").localeCompare(String(left ?? ""));
      });

      sorted.forEach((row) => {
        const tr = document.createElement("tr");
        headers.forEach((header) => {
          const td = document.createElement("td");
          const value = row[header];
          if (header === "polymarketUrl" && typeof value === "string" && value) {
            const link = document.createElement("a");
            link.href = value;
            link.target = "_blank";
            link.rel = "noreferrer";
            link.textContent = "Open market";
            link.style.color = "#7dd3fc";
            td.appendChild(link);
          } else {
            td.textContent = fmt(value, header);
          }
          if (header === "gap" && typeof value === "number") td.className = value >= 0 ? "positive" : "negative";
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    function renderChart() {
      const svg = document.getElementById("chart");
      const tooltip = document.getElementById("chart-tooltip");
      const width = 760;
      const height = 320;
      const pad = { top: 20, right: 20, bottom: 50, left: 46 };
      const innerW = width - pad.left - pad.right;
      const innerH = height - pad.top - pad.bottom;
      const maxY = 100;
      const stepX = chartRows.length > 1 ? innerW / (chartRows.length - 1) : innerW;
      const toX = (i) => pad.left + i * stepX;
      const toY = (v) => pad.top + innerH - (v / maxY) * innerH;

      const grid = [0, 25, 50, 75, 100].map((value) =>
        '<line x1="' + pad.left + '" y1="' + toY(value) + '" x2="' + (pad.left + innerW) + '" y2="' + toY(value) + '" stroke="#24304a" />' +
        '<text x="8" y="' + (toY(value) + 4) + '" fill="#94a3b8" font-size="11">' + value + '%</text>'
      ).join("");

      const pathFor = (key) => chartRows.map((row, i) => (i ? "L" : "M") + toX(i) + "," + toY(row[key])).join(" ");
      const labels = chartRows.map((row, i) =>
        '<text x="' + toX(i) + '" y="' + (height - 14) + '" text-anchor="middle" fill="#94a3b8" font-size="11">' + row.label + '</text>'
      ).join("");
      const dots = (key, color) => chartRows.map((row, i) =>
        '<circle cx="' + toX(i) + '" cy="' + toY(row[key]) + '" r="4" fill="' + color + '" />'
      ).join("");
      const hoverTargets = chartRows.map((row, i) =>
        '<g class="hover-target" data-index="' + i + '">' +
          '<line x1="' + toX(i) + '" y1="' + pad.top + '" x2="' + toX(i) + '" y2="' + (pad.top + innerH) + '" stroke="#334155" stroke-dasharray="4 4" opacity="0" />' +
          '<circle cx="' + toX(i) + '" cy="' + toY(row.modelYes) + '" r="8" fill="#4f8cff" fill-opacity="0" />' +
          '<circle cx="' + toX(i) + '" cy="' + toY(row.marketYes) + '" r="8" fill="#f97316" fill-opacity="0" />' +
          '<rect x="' + (toX(i) - Math.max(24, stepX / 2)) + '" y="' + pad.top + '" width="' + Math.max(48, stepX) + '" height="' + innerH + '" fill="transparent" />' +
        '</g>'
      ).join("");

      svg.innerHTML =
        grid +
        '<path d="' + pathFor("modelYes") + '" fill="none" stroke="#4f8cff" stroke-width="3" />' +
        '<path d="' + pathFor("marketYes") + '" fill="none" stroke="#f97316" stroke-width="3" />' +
        dots("modelYes", "#4f8cff") +
        dots("marketYes", "#f97316") +
        hoverTargets +
        labels;

      const targets = Array.from(svg.querySelectorAll(".hover-target"));
      const showTooltip = (index, clientX, clientY) => {
        const row = chartRows[index];
        if (!row || !tooltip) return;
        tooltip.innerHTML =
          '<div class="label">' + row.label + '</div>' +
          '<div class="row"><span>Model YES</span><strong>' + row.modelYes.toFixed(1) + '%</strong></div>' +
          '<div class="row"><span>Market YES</span><strong>' + row.marketYes.toFixed(1) + '%</strong></div>' +
          '<div class="row"><span>Gap</span><strong class="' + (row.gap >= 0 ? 'positive' : 'negative') + '">' + (row.gap >= 0 ? '+' : '') + row.gap.toFixed(1) + ' pts</strong></div>';
        tooltip.classList.add("visible");
        const bounds = svg.getBoundingClientRect();
        const localX = clientX - bounds.left;
        const localY = clientY - bounds.top;
        const tooltipX = Math.min(bounds.width - 190, Math.max(10, localX + 12));
        const tooltipY = Math.min(bounds.height - 110, Math.max(10, localY - 16));
        tooltip.style.left = tooltipX + "px";
        tooltip.style.top = tooltipY + "px";
        targets.forEach((target, targetIndex) => {
          const line = target.querySelector("line");
          if (line) line.setAttribute("opacity", targetIndex === index ? "1" : "0");
        });
      };
      const hideTooltip = () => {
        if (!tooltip) return;
        tooltip.classList.remove("visible");
        targets.forEach((target) => {
          const line = target.querySelector("line");
          if (line) line.setAttribute("opacity", "0");
        });
      };

      targets.forEach((target, index) => {
        target.addEventListener("mousemove", (event) => showTooltip(index, event.clientX, event.clientY));
        target.addEventListener("mouseenter", (event) => showTooltip(index, event.clientX, event.clientY));
        target.addEventListener("mouseleave", hideTooltip);
        target.addEventListener("touchstart", (event) => {
          const touch = event.touches[0];
          if (touch) showTooltip(index, touch.clientX, touch.clientY);
        }, { passive: true });
      });
    }

    renderSummary();
    renderTable();
    renderChart();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function DecisionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
        {(items.length ? items : ["No notes right now."]).map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

type EditableThesisState = Pick<ThesisCard, "bullishCatalyst" | "bearishCatalyst" | "wordingCatalyst" | "invalidation"> & {
  lastEdited: string;
};

function EditableThesisBox({ thesis, marketLabel, nowMs }: { thesis: ThesisCard; marketLabel: string; nowMs: number }) {
  const storageKey = `iran-ops:thesis:${thesis.marketId}`;
  const [expanded, setExpanded] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [draft, setDraft] = React.useState<EditableThesisState>(() => ({
    bullishCatalyst: thesis.bullishCatalyst,
    bearishCatalyst: thesis.bearishCatalyst,
    wordingCatalyst: thesis.wordingCatalyst,
    invalidation: thesis.invalidation,
    lastEdited: new Date().toISOString(),
  }));

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setDraft(JSON.parse(saved) as EditableThesisState);
      }
    } catch {
      // Keep generated thesis content when local storage is unavailable or malformed.
    }
  }, [storageKey]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, storageKey]);

  const update = (key: keyof Omit<EditableThesisState, "lastEdited">, value: string) => {
    setDraft((current) => ({ ...current, [key]: value, lastEdited: new Date().toISOString() }));
  };

  const reset = () => {
    setDraft({
      bullishCatalyst: thesis.bullishCatalyst,
      bearishCatalyst: thesis.bearishCatalyst,
      wordingCatalyst: thesis.wordingCatalyst,
      invalidation: thesis.invalidation,
      lastEdited: new Date().toISOString(),
    });
  };

  const copy = async () => {
    const text = [
      `Bucket: ${marketLabel}`,
      `Bullish: ${draft.bullishCatalyst}`,
      `Bearish: ${draft.bearishCatalyst}`,
      `Wording: ${draft.wordingCatalyst}`,
      `Invalidation: ${draft.invalidation}`,
      `Updated: ${formatDateTimeEt(draft.lastEdited)}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">What Changes This?</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Last edited {relativeTimeFrom(draft.lastEdited, nowMs)} · {marketLabel}
          </div>
        </div>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs">
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded ? (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <EditableThesisLine label="Bullish catalyst" tone="positive" value={draft.bullishCatalyst} onChange={(value) => update("bullishCatalyst", value)} />
            <EditableThesisLine label="Bearish catalyst" tone="negative" value={draft.bearishCatalyst} onChange={(value) => update("bearishCatalyst", value)} />
            <EditableThesisLine label="Wording catalyst" tone="warning" value={draft.wordingCatalyst} onChange={(value) => update("wordingCatalyst", value)} />
            <EditableThesisLine label="Invalidation" tone="negative" value={draft.invalidation} onChange={(value) => update("invalidation", value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-accent)]">
              {copied ? "Copied" : "Copy thesis"}
            </button>
            <button type="button" onClick={reset} className="rounded-full border border-[var(--color-border)] px-3 py-2 text-xs">
              Reset to generated thesis
            </button>
            {thesis.provisional ? <Badge tone="warning">provisional</Badge> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function EditableThesisLine({
  label,
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: "positive" | "negative" | "warning";
  value: string;
  onChange: (value: string) => void;
}) {
  const marker = tone === "positive" ? "↑" : tone === "negative" ? "×" : "§";
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {marker} {label}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text)]"
      />
    </label>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "positive" | "negative" | "warning" | "neutral" }) {
  const className =
    tone === "positive"
      ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
      : tone === "negative"
        ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
        : tone === "warning"
          ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
          : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}>{children}</span>;
}

function ModelMarketTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm shadow-lg">
      <div className="font-medium text-[var(--color-text)]">{label}</div>
      <div className="mt-2 space-y-1 text-[var(--color-text-muted)]">
        {payload.map((entry) => (
          <div
            key={`${entry.name}-${entry.value}`}
            className="flex min-w-[160px] items-center justify-between gap-4"
          >
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-medium text-[var(--color-text)]">
              {typeof entry.value === "number" ? `${entry.value.toFixed(1)}%` : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverSummary({
  title,
  tone,
  drivers,
}: {
  title: string;
  tone: "positive" | "negative";
  drivers: DashboardPayload["currentBelief"]["topPositiveDrivers"];
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <h3
        className={`mb-3 text-sm font-semibold uppercase tracking-[0.2em] ${
          tone === "positive" ? "text-[var(--color-positive-text)]" : "text-[var(--color-danger-text)]"
        }`}
      >
        {title}
      </h3>
      <div className="space-y-3">
        {drivers.length ? drivers.map((driver) => (
          <div key={driver.signalId} className="rounded-lg bg-[var(--color-surface-muted)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{driver.title}</span>
              <span className="text-sm font-semibold">
                {driver.pointsDelta >= 0 ? "+" : "-"}
                {Math.abs(driver.pointsDelta * 100).toFixed(1)} pts
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{driver.narrative}</p>
          </div>
        )) : <p className="text-sm text-[var(--color-text-muted)]">No active drivers.</p>}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === "warning"
          ? "border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)]"
          : "border-[var(--color-border)]"
      }`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{title}</div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function AttentionCard({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warning" | "positive";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[var(--color-warning-bg)] bg-[var(--color-warning-bg)]"
      : tone === "positive"
        ? "border-[var(--color-positive-bg)] bg-[var(--color-positive-bg)]"
        : "border-[var(--color-border)] bg-[var(--color-panel)]";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{title}</div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function roundPct(value: number) {
  return Number((value * 100).toFixed(1));
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}
