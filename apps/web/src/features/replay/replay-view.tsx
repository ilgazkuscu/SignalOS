"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import type { AwaitedReplayPayload } from "@/lib/types/view";
import type { MarketId, ReplayHistoryEntry } from "@/lib/types/domain";
import { formatDateEt, formatDateTimeEt } from "@/lib/utils/time";

export function ReplayView({ replay }: { replay: AwaitedReplayPayload }) {
  const [replayData, setReplayData] = useState(replay);
  const [index, setIndex] = useState(0);
  const [marketId, setMarketId] = useState<MarketId>("apr-21");
  const [dateView, setDateView] = useState<DateViewMode>("all");
  const [exactDate, setExactDate] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [speedMs, setSpeedMs] = useState(1200);
  const replayChartRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setReplayData(replay);
  }, [replay]);

  useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_POLYMARKET_POLL_INTERVAL_MS ?? 30_000);

    const refreshReplay = async () => {
      try {
        const response = await fetch(`/api/replay?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as AwaitedReplayPayload;
        setReplayData((current) => {
          const wasAtEnd = index >= current.history.length - 1;
          if (wasAtEnd) {
            setIndex(Math.max(next.history.length - 1, 0));
          } else {
            setIndex((prev) => Math.min(prev, Math.max(next.history.length - 1, 0)));
          }
          return next;
        });
      } catch {
        // Keep the current replay payload if refresh fails.
      }
    };

    void refreshReplay();
    const timer = window.setInterval(() => {
      void refreshReplay();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [index]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= replayData.history.length - 1) {
          window.clearInterval(timer);
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, replayData.history.length, speedMs]);

  const current = replayData.history[index] ?? replayData.history[0];
  const previous = replayData.history[Math.max(0, index - 1)] ?? current;
  const windowed = replayData.history.slice(Math.max(0, index - 2), index + 3);
  const latest = replayData.history[replayData.history.length - 1] ?? current;

  const availableExactDates = useMemo(
    () => Array.from(new Set(replayData.history.map((entry) => toIsoDate(entry.asOf)))).sort(),
    [replayData.history],
  );

  useEffect(() => {
    if (!availableExactDates.length) {
      setExactDate("");
      return;
    }
    setExactDate((currentValue) =>
      currentValue && availableExactDates.includes(currentValue)
        ? currentValue
        : availableExactDates[availableExactDates.length - 1],
    );
  }, [availableExactDates]);

  const chartData = useMemo(
    () =>
      buildReplayChartRows({
        history: replayData.history,
        marketId,
        dateView,
        exactDate,
      }),
    [dateView, exactDate, marketId, replayData.history],
  );
  const newsEvaluationDays = useMemo(
    () => groupNewsEvaluationByDay(replayData.newsEvaluationLedger ?? []),
    [replayData.newsEvaluationLedger],
  );
  const newsEvaluationCount = replayData.newsEvaluationLedger?.length ?? 0;
  const modelUpdatedCount = replayData.newsEvaluationLedger?.filter((item) => item.modelUpdated).length ?? 0;
  const selectedMarketLabel = marketId.replace("-", " ").toUpperCase();

  const currentGap = current.gapByContract[marketId] ?? 0;
  const bucketDelta = current.belief.yesProbabilityByContract[marketId] - previous.belief.yesProbabilityByContract[marketId];
  const marketDelta = (current.marketByContract[marketId] ?? 0) - (previous.marketByContract[marketId] ?? 0);
  const largestHistoricalDivergence = chartData.reduce(
    (best, entry) => {
      const gap = Math.abs(entry.gap / 100);
      return gap > best.value ? { value: gap, asOf: entry.asOf } : best;
    },
    { value: 0, asOf: chartData[0]?.asOf ?? replayData.generatedAt },
  );
  const currentGapPercentile = percentile(
    chartData.map((entry) => Math.abs(entry.gap / 100)),
    Math.abs(chartData[chartData.length - 1]?.gap ?? currentGap * 100) / 100,
  );
  const marketLeadMessage =
    Math.abs(marketDelta) > Math.abs(bucketDelta)
      ? "The outside view moved first on the latest step."
      : "The prediction caught up quickly on the latest step.";
  const downloadReplayChartAsJpg = React.useCallback(async () => {
    const svg = replayChartRef.current?.querySelector("svg");
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
        image.onerror = () => reject(new Error("Could not render replay chart image."));
      });
      image.src = svgUrl;
      await imageLoaded;

      const bounds = svg.getBoundingClientRect();
      const width = Math.max(960, Math.round(bounds.width || 960));
      const height = Math.max(480, Math.round(bounds.height || 480));
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.scale(2, 2);
      context.fillStyle = "#08111c";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const jpgUrl = canvas.toDataURL("image/jpeg", 0.94);
      const anchor = document.createElement("a");
      anchor.href = jpgUrl;
      anchor.download = `replay-overlay-${marketId}-${replayData.generatedAt.replace(/[:.]/g, "-")}.jpg`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, [marketId, replayData.generatedAt]);
  const exportReplayHtml = React.useCallback(() => {
    const stamp = replayData.generatedAt.replace(/[:.]/g, "-");
    const html = buildReplayHtml({
      generatedAt: replayData.generatedAt,
      marketId,
      marketLabel: selectedMarketLabel,
      rows: chartData,
      latestAsOf: latest.asOf,
    });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `replay-overlay-${marketId}-${stamp}.html`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [chartData, latest.asOf, marketId, replayData.generatedAt, selectedMarketLabel]);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
      <ErrorBoundary title="Proof Controls">
        <Panel
          title="Proof Controls"
          subtitle="Go back in time and see what the app knew then."
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Date</span>
              <select
                aria-label="Proof date bucket"
                value={marketId}
                onChange={(event) => setMarketId(event.target.value as MarketId)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
              >
                <option value="apr-15">apr-15</option>
                <option value="apr-21">apr-21</option>
                <option value="apr-30">apr-30</option>
                <option value="may-31">may-31</option>
                <option value="jun-30">jun-30</option>
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">By date</span>
                <select
                  aria-label="Proof date grouping"
                  value={dateView}
                  onChange={(event) => setDateView(event.target.value as DateViewMode)}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
                >
                  <option value="all">All dates</option>
                  <option value="exact">Exact date</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </label>

              {dateView === "exact" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Exact date</span>
                  <select
                    aria-label="Proof exact date selector"
                    value={exactDate}
                    onChange={(event) => setExactDate(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
                  >
                    {availableExactDates.map((value) => (
                      <option key={value} value={value}>
                        {formatDateEt(`${value}T12:00:00.000Z`)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-3 text-sm text-[var(--color-text-muted)]">
                  Uses the same date view for both lines.
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Jump to time</span>
              <select
                aria-label="Proof timestamp selector"
                value={index}
                onChange={(event) => setIndex(Number(event.target.value))}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
              >
                  {replayData.history.map((entry, entryIndex) => (
                  <option key={entry.asOf} value={entryIndex}>
                    {formatDateTimeEt(entry.asOf)}
                  </option>
                ))}
              </select>
            </label>

            <input
              aria-label="Proof time slider"
              type="range"
              min={0}
              max={Math.max(replayData.history.length - 1, 0)}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="w-full"
            />

            <div className="grid grid-cols-4 gap-2">
              <ControlButton label="Back" onClick={() => setIndex((value) => Math.max(0, value - 1))} icon={<SkipBack className="h-4 w-4" />} />
              <ControlButton
                label={isPlaying ? "Pause" : "Play"}
                onClick={() => setIsPlaying((currentValue) => !currentValue)}
                icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              />
              <ControlButton label="Next" onClick={() => setIndex((value) => Math.min(replayData.history.length - 1, value + 1))} icon={<SkipForward className="h-4 w-4" />} />
              <ControlButton label="Reset" onClick={() => setIndex(0)} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block">Playback speed</span>
                <select
                  value={speedMs}
                  onChange={(event) => setSpeedMs(Number(event.target.value))}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2"
                >
                  <option value={1800}>Slow</option>
                  <option value={1200}>Normal</option>
                  <option value={700}>Fast</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] px-3 py-2 text-sm">
                <input type="checkbox" checked={showAnnotations} onChange={(event) => setShowAnnotations(event.target.checked)} />
                Show notes
              </label>
            </div>

            <div className="text-xs text-[var(--color-text-muted)]">
              Updated through {formatDateTimeEt(replayData.generatedAt)}
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="font-semibold">{formatDateTimeEt(current.asOf)}</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ReplayMetric label="Prediction change" value={bucketDelta} />
                <ReplayMetric label="Outside view change" value={marketDelta} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[var(--color-text-muted)]">
                <div>Our prediction {(current.belief.yesProbabilityByContract[marketId] * 100).toFixed(1)}%</div>
                <div>Outside view {(((current.marketByContract[marketId] ?? 0) as number) * 100).toFixed(1)}%</div>
                <div>Gap {formatPoints(currentGap)}</div>
                <div>Real-world progress {(current.belief.trueDeescalationProbability * 100).toFixed(1)}%</div>
                <div>Clear public statement {(current.belief.formalAnnouncementProbability * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <div className="space-y-5">
        <ErrorBoundary title="Proof Chart">
          <Panel
            title="Proof Chart"
            subtitle="Our prediction compared with the outside view."
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-chart-model)]" />
                  Our prediction
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-chart-market)]" />
                  Outside view
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  Gap
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                  Now
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void downloadReplayChartAsJpg()}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                >
                  Download JPG
                </button>
                <button
                  type="button"
                  onClick={exportReplayHtml}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                >
                  Interactive HTML
                </button>
              </div>
            </div>
            {chartData.length ? (
              <div
                ref={replayChartRef}
                className="grid gap-3 xl:grid-cols-2"
              >
                <ReplayChartCard title="Prediction Path" subtitle="How both lines moved over time." className="h-[488px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} minTickGap={18} />
                      <YAxis stroke="var(--color-text-muted)" unit="%" tick={{ fontSize: 12 }} width={48} domain={[0, 100]} />
                      <Tooltip content={<ReplayTooltip />} />
                      <Line type="linear" dataKey="modelYes" name="Our prediction" stroke="var(--color-chart-model)" strokeWidth={3} dot={false} />
                      <Line type="linear" dataKey="marketYes" name="Outside view" stroke="var(--color-chart-market)" strokeWidth={2.5} dot={false} />
                      <Line type="linear" dataKey="nowMarker" name="Now" stroke="#ef4444" strokeWidth={0} dot={{ r: 6, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ReplayChartCard>

                <ReplayChartCard title="Gap" subtitle="How far apart the two views were." className="h-[488px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" stroke="var(--color-text-muted)" tick={{ fontSize: 11 }} minTickGap={18} />
                      <YAxis stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} width={44} tickFormatter={(value) => `${value}pt`} />
                      <Tooltip content={<ReplayTooltip />} />
                      <Line type="linear" dataKey="gap" name="Gap" stroke="var(--color-accent)" strokeWidth={3} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ReplayChartCard>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-text-muted)]">
                No proof points are available for this view.
              </div>
            )}

            {showAnnotations ? (
              <div className="mt-4 rounded-2xl border border-[var(--color-border)] p-4">
                <div className="text-sm font-semibold">Key notes</div>
                <div className="mt-3 space-y-3">
                  {replayData.eventAnnotations.map((annotation) => (
                    <div key={annotation.id} className="rounded-2xl bg-[var(--color-surface-muted)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">{annotation.title}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{formatDateTimeEt(annotation.timestamp)}</div>
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-text-muted)]">{annotation.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Daily News Evaluation Ledger">
          <Panel
            title="News Read"
            subtitle="Each news item is checked before the chart updates."
          >
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <InsightTile label="News read" value={String(newsEvaluationCount)} />
              <InsightTile label="Prediction changes" value={String(modelUpdatedCount)} />
              <InsightTile label="Days checked" value={String(newsEvaluationDays.length)} />
            </div>
            {newsEvaluationDays.length ? (
              <div className="space-y-4">
                {newsEvaluationDays.map((day) => (
                  <div key={day.day} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{formatDateEt(`${day.day}T12:00:00.000Z`)}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        {day.items.length} read · {day.items.filter((item) => item.modelUpdated).length} changed
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {day.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{item.headline}</div>
                              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                              {item.sourceId} · {formatDateTimeEt(item.occurredAt)}
                              </div>
                            </div>
                            <span
                              className={`rounded-full border border-[var(--color-border)] px-2 py-1 text-xs font-semibold ${
                                item.modelUpdated
                                  ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                              }`}
                            >
                              {item.modelUpdated ? "Changed" : "Read"}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-xs text-[var(--color-text-muted)] md:grid-cols-[1fr_auto]">
                            <div>{item.note}</div>
                            <div className="font-mono">
                              {item.strongestBucket}: {(item.beforeYes * 100).toFixed(1)}% to {(item.afterYes * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-text-muted)]">
                No news items were available.
              </div>
            )}
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Proof Insight">
          <Panel
            title="Proof Insight"
            subtitle="What the proof says in plain English."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InsightTile label="Biggest gap" value={`${formatPoints(largestHistoricalDivergence.value)} at ${formatDateTimeEt(largestHistoricalDivergence.asOf)}`} />
              <InsightTile label="Current gap rank" value={`${currentGapPercentile.toFixed(0)}th percentile`} />
            </div>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">{marketLeadMessage}</p>
            <div className="mt-4 rounded-2xl border border-[var(--color-border)] p-4">
              <div className="text-sm font-semibold">Current reason</div>
              <div className="mt-2 space-y-2 text-sm text-[var(--color-text-muted)]">
                {current.explanation.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          </Panel>
        </ErrorBoundary>

        <ErrorBoundary title="Local Proof Window">
          <Panel title="What Was Visible Then" subtitle="Only the items known at that moment.">
            <div className="space-y-3">
                {windowed.map((entry, windowIndex) => {
                  const absoluteIndex = Math.max(0, index - 2) + windowIndex;
                const isActive = absoluteIndex === index;

                return (
                  <ReplayWindowCard key={entry.asOf} entry={entry} marketId={marketId} isActive={isActive} />
                );
              })}
            </div>
          </Panel>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function ReplayWindowCard({
  entry,
  marketId,
  isActive,
}: {
  entry: ReplayHistoryEntry;
  marketId: MarketId;
  isActive: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isActive ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{formatDateTimeEt(entry.asOf)}</div>
        <div className="text-sm">{(entry.belief.yesProbabilityByContract[marketId] * 100).toFixed(1)}%</div>
      </div>
      <div className="mt-2 text-sm text-[var(--color-text-muted)]">
        Prediction {(entry.belief.yesProbabilityByContract[marketId] * 100).toFixed(1)}% · Outside view{" "}
        {(((entry.marketByContract[marketId] ?? 0) as number) * 100).toFixed(1)}% · Gap {formatPoints(entry.gapByContract[marketId] ?? 0)}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Active evidence</div>
          <div className="mt-2 text-sm text-[var(--color-text-muted)]">{entry.activeSignals.map((signal) => signal.subtype).join(", ") || "None"}</div>
        </div>
        <div className="rounded-xl bg-[var(--color-surface-muted)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Latest events</div>
          <div className="mt-2 text-sm text-[var(--color-text-muted)]">{entry.sourceEvents.map((event) => event.title).join(", ") || "None"}</div>
        </div>
      </div>
    </div>
  );
}

type DateViewMode = "all" | "exact" | "day" | "week" | "month";

type ReplayChartRow = {
  asOf: string;
  asOfLabel: string;
  label: string;
  modelYes: number;
  marketYes: number;
  gap: number;
  nowMarker: number | null;
};

function ControlButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] px-3 py-2 text-sm">
      {icon}
      {label}
    </button>
  );
}

function ReplayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{formatPoints(value)}</div>
    </div>
  );
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

function ReplayTooltip({
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
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm">
      <div className="font-semibold">{label ?? ""}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.value}`} className="flex items-center justify-between gap-3">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPoints(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

function percentile(values: number[], target: number) {
  const ordered = [...values].sort((left, right) => left - right);
  const belowOrEqual = ordered.filter((value) => value <= target).length;
  return (belowOrEqual / Math.max(ordered.length, 1)) * 100;
}

function ReplayChartCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 ${className ?? ""}`}>
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</div>
      </div>
      <div className="h-[calc(100%-3.25rem)]">{children}</div>
    </div>
  );
}

function buildReplayChartRows({
  history,
  marketId,
  dateView,
  exactDate,
}: {
  history: ReplayHistoryEntry[];
  marketId: MarketId;
  dateView: DateViewMode;
  exactDate: string;
}): ReplayChartRow[] {
  const rows = history.map((entry, entryIndex) => ({
    asOf: entry.asOf,
    asOfLabel: formatDateEt(entry.asOf),
    label: formatDateEt(entry.asOf),
    modelYes: Number((entry.belief.yesProbabilityByContract[marketId] * 100).toFixed(1)),
    marketYes: Number((((entry.marketByContract[marketId] ?? 0) as number) * 100).toFixed(1)),
    gap: Number((((entry.gapByContract[marketId] ?? 0) as number) * 100).toFixed(1)),
    nowMarker:
      entryIndex === history.length - 1
        ? Number((((entry.marketByContract[marketId] ?? 0) as number) * 100).toFixed(1))
        : null,
  }));

  if (dateView === "all") {
    return rows;
  }

  if (dateView === "exact") {
    return rows.filter((row) => toIsoDate(row.asOf) === exactDate);
  }

  return aggregateReplayChartRows(rows, dateView);
}

function aggregateReplayChartRows(rows: ReplayChartRow[], dateView: Exclude<DateViewMode, "all" | "exact">) {
  const buckets = new Map<
    string,
    {
      asOf: string;
      label: string;
      asOfLabel: string;
      modelTotal: number;
      marketTotal: number;
      gapTotal: number;
      count: number;
      hasNowMarker: boolean;
      lastNowMarker: number | null;
    }
  >();

  rows.forEach((row) => {
    const bucket = bucketDate(row.asOf, dateView);
    const existing = buckets.get(bucket.key) ?? {
      asOf: bucket.iso,
      label: bucket.label,
      asOfLabel: bucket.label,
      modelTotal: 0,
      marketTotal: 0,
      gapTotal: 0,
      count: 0,
      hasNowMarker: false,
      lastNowMarker: null,
    };
    existing.modelTotal += row.modelYes;
    existing.marketTotal += row.marketYes;
    existing.gapTotal += row.gap;
    existing.count += 1;
    if (row.nowMarker !== null) {
      existing.hasNowMarker = true;
      existing.lastNowMarker = row.nowMarker;
    }
    buckets.set(bucket.key, existing);
  });

  return Array.from(buckets.values()).map((bucket) => ({
    asOf: bucket.asOf,
    asOfLabel: bucket.asOfLabel,
    label: bucket.label,
    modelYes: Number((bucket.modelTotal / bucket.count).toFixed(1)),
    marketYes: Number((bucket.marketTotal / bucket.count).toFixed(1)),
    gap: Number((bucket.gapTotal / bucket.count).toFixed(1)),
    nowMarker: bucket.hasNowMarker ? bucket.lastNowMarker : null,
  }));
}

function groupNewsEvaluationByDay(
  items: NonNullable<AwaitedReplayPayload["newsEvaluationLedger"]>,
) {
  const buckets = new Map<string, NonNullable<AwaitedReplayPayload["newsEvaluationLedger"]>>();
  for (const item of items) {
    const bucket = buckets.get(item.day) ?? [];
    bucket.push(item);
    buckets.set(item.day, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([day, bucketItems]) => ({
      day,
      items: bucketItems.slice().sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    }));
}

function toIsoDate(value: string) {
  return value.slice(0, 10);
}

function bucketDate(value: string, dateView: Exclude<DateViewMode, "all" | "exact">) {
  const date = new Date(value);

  if (dateView === "day") {
    date.setUTCHours(0, 0, 0, 0);
    return { key: date.toISOString(), iso: date.toISOString(), label: formatDateEt(date.toISOString()) };
  }

  if (dateView === "week") {
    const day = date.getUTCDay();
    const offset = (day + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    date.setUTCHours(0, 0, 0, 0);
    return {
      key: date.toISOString(),
      iso: date.toISOString(),
      label: `Week of ${formatDateEt(date.toISOString())}`,
    };
  }

  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return {
    key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
    iso: date.toISOString(),
    label: date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
  };
}

function buildReplayHtml({
  generatedAt,
  marketId,
  marketLabel,
  rows,
  latestAsOf,
}: {
  generatedAt: string;
  marketId: MarketId;
  marketLabel: string;
  rows: Array<{ asOf: string; asOfLabel: string; modelYes: number; marketYes: number; gap: number }>;
  latestAsOf: string;
}) {
  const points = rows.map((row) => ({
    label: row.asOf,
    modelYes: row.modelYes,
    marketYes: row.marketYes,
    gap: row.gap,
  }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Proof ${marketLabel}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { margin: 0; padding: 24px; background: #08111c; color: #e2e8f0; font-family: sans-serif; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    .meta { color: #93a4b8; margin-bottom: 16px; }
    .card { border: 1px solid rgba(148,163,184,0.22); border-radius: 12px; padding: 16px; background: rgba(13,20,34,0.9); }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid rgba(148,163,184,0.16); text-align: left; }
    th { color: #93a4b8; font-weight: 600; }
    td { color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Proof - ${marketLabel}</h1>
    <div class="meta">Date ${marketId} | Generated ${generatedAt} | Current point ${latestAsOf}</div>
    <div class="card">
      <canvas id="chart" width="1040" height="520"></canvas>
      <table>
        <thead>
          <tr>
            <th>As of</th>
            <th>Our prediction</th>
            <th>Outside view</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>
          ${points
            .map(
              (row) => `<tr>
            <td>${row.label}</td>
            <td>${row.modelYes.toFixed(1)}%</td>
            <td>${row.marketYes.toFixed(1)}%</td>
            <td>${row.gap >= 0 ? "+" : ""}${row.gap.toFixed(1)} pts</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    const labels = ${JSON.stringify(points.map((row) => row.label))};
    const latestAsOf = ${JSON.stringify(latestAsOf)};
    const latestIndex = labels.findIndex((label) => label === latestAsOf);
    const modelData = ${JSON.stringify(points.map((row) => row.modelYes))};
    const marketData = ${JSON.stringify(points.map((row) => row.marketYes))};
    const gapData = ${JSON.stringify(points.map((row) => row.gap))};
    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Our prediction', data: modelData, borderColor: '#2dd4bf', backgroundColor: '#2dd4bf', tension: 0, yAxisID: 'prob' },
          { label: 'Outside view', data: marketData, borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0, yAxisID: 'prob' },
          { label: 'Gap', data: gapData, borderColor: '#94a3b8', backgroundColor: 'rgba(45,212,191,0.18)', tension: 0, fill: true, yAxisID: 'gap' },
          { label: 'Now', data: labels.map((_, i) => i === latestIndex ? marketData[latestIndex] : null), borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 6, showLine: false, yAxisID: 'prob' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#e2e8f0' } },
          tooltip: {
            callbacks: {
              title(items) {
                return items[0]?.label ?? '';
              },
              afterBody(items) {
                const index = items[0]?.dataIndex ?? 0;
                const gap = gapData[index] ?? 0;
                return 'Gap: ' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + ' pts';
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#93a4b8' }, grid: { color: 'rgba(148,163,184,0.12)' } },
          prob: { position: 'left', ticks: { color: '#93a4b8' }, grid: { color: 'rgba(148,163,184,0.12)' } },
          gap: { position: 'right', ticks: { color: '#93a4b8' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  </script>
</body>
</html>`;
}
