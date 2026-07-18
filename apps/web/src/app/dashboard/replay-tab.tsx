"use client";

import React from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, FamilyReplaySeries, MarketFamily } from "@/modules/markets";
import { formatDateEt, formatDateTimeEt } from "@/lib/utils/time";

type ReplaySeriesRow = {
  asOf: string;
  label: string;
  modelYes: number;
  marketYes: number;
  gap: number;
};

export function buildReplayRowsForBucket(series: FamilyReplaySeries | undefined, bucketId: string | undefined): ReplaySeriesRow[] {
  if (!series || !bucketId) return [];

  return series.frames
    .map((frame) => {
      const snapshot = frame.bucketSnapshots.find((bucket) => bucket.bucketId === bucketId);
      if (!snapshot) return null;
      if (snapshot.status !== "active") return null;
      if (snapshot.modelProbability === null || snapshot.marketPrice === null) return null;

      return {
        asOf: frame.timestamp,
        label: formatDateEt(frame.timestamp),
        modelYes: Number((snapshot.modelProbability * 100).toFixed(1)),
        marketYes: Number((snapshot.marketPrice * 100).toFixed(1)),
        gap: Number(((snapshot.modelProbability - snapshot.marketPrice) * 100).toFixed(1)),
      };
    })
    .filter((row): row is ReplaySeriesRow => Boolean(row));
}

function buildReplayEmptyState(
  series: FamilyReplaySeries | undefined,
  bucketId: string | undefined,
  bucketLabel: string | undefined,
) {
  if (!series || !bucketId) {
    return "Replay series is unavailable for this family.";
  }

  const matchingSnapshots = series.frames
    .map((frame) => frame.bucketSnapshots.find((bucket) => bucket.bucketId === bucketId))
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

  if (!matchingSnapshots.length) {
    return `No replay bucket matched ${bucketLabel ?? "the selected date"}.`;
  }

  if (matchingSnapshots.every((snapshot) => snapshot.status === "not_yet_issued")) {
    return `${bucketLabel ?? "This date"} had not opened yet in the selected replay window.`;
  }

  if (matchingSnapshots.every((snapshot) => snapshot.status === "closed")) {
    return `${bucketLabel ?? "This date"} is already closed in the selected replay window, so there is no live comparison left to show.`;
  }

  return `Comparison data for ${bucketLabel ?? "the selected date"} is incomplete right now. The dashboard is withholding the chart instead of showing misleading output.`;
}

export function ReplayTab({
  family,
  output,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
}) {
  const bucketOptions = React.useMemo(
    () => family.bucketOrder.map((bucket) => ({ id: bucket.id, label: bucket.label })),
    [family.bucketOrder],
  );
  const [selectedBucketId, setSelectedBucketId] = React.useState(family.primaryReplayBucketId);

  React.useEffect(() => {
    setSelectedBucketId((current) =>
      bucketOptions.some((option) => option.id === current) ? current : family.primaryReplayBucketId,
    );
  }, [bucketOptions, family.primaryReplayBucketId]);

  const selectedBucket = bucketOptions.find((option) => option.id === selectedBucketId) ?? bucketOptions[0];
  const replayRows = React.useMemo(
    () => buildReplayRowsForBucket(output.replaySeries, selectedBucket?.id),
    [output.replaySeries, selectedBucket?.id],
  );
  const latestRow = replayRows.at(-1);
  const firstRow = replayRows[0];
  const byDateLabel = `By Date (${bucketOptions.map((option) => option.label).join(" / ")})`;

  return (
    <div className="space-y-5">
      <Panel
        title="Proof"
        subtitle="Pick a date first. The chart then compares only that selected date."
      >
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <label className="block text-sm">
              <span className="mb-2 flex items-center gap-2 font-semibold text-[var(--color-text)]">
                <CalendarDays className="h-4 w-4" />
                {byDateLabel}
              </span>
              <select
                aria-label="Replay date selector"
                value={selectedBucket?.id ?? ""}
                onChange={(event) => setSelectedBucketId(event.target.value)}
                className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
              >
                {bucketOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                Date intervals shown here belong to the current question only.
              </div>
            </label>

            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Selected context</div>
              <div className="mt-2 text-lg font-semibold text-[var(--color-text)]">{selectedBucket?.label ?? "Unavailable"}</div>
              <div className="mt-2 text-sm text-[var(--color-text-muted)]">
                {firstRow && latestRow
                  ? `${formatDateEt(firstRow.asOf)} to ${formatDateEt(latestRow.asOf)}`
                  : "No comparison window available for this date."}
              </div>
            </div>

            {latestRow ? (
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <ReplayMetric label="Prediction" value={`${latestRow.modelYes.toFixed(1)}%`} />
                <ReplayMetric label="Outside view" value={`${latestRow.marketYes.toFixed(1)}%`} />
                <ReplayMetric label="Gap" value={formatSignedPoints(latestRow.gap / 100)} emphasis />
              </div>
            ) : null}
          </div>

          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
            <div className="mb-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {family.displayName} replay by {selectedBucket?.label ?? "date"}
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                Updated through {formatDateTimeEt(output.generatedAt)}. Selected date only, prediction versus outside view only.
              </div>
            </div>

            {replayRows.length ? (
              <div className="space-y-4">
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={replayRows} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tickLine={false} axisLine={false} width={44} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip content={<ReplayTooltip />} />
                      <Line type="linear" dataKey="modelYes" name="Prediction" stroke="var(--color-chart-model)" strokeWidth={3} dot={false} />
                      <Line type="linear" dataKey="marketYes" name="Outside view" stroke="var(--color-chart-market)" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                  Latest comparable point for {selectedBucket?.label ?? "the selected date"}: prediction {latestRow?.modelYes.toFixed(1)}%, outside view {latestRow?.marketYes.toFixed(1)}%, gap {formatSignedPoints((latestRow?.gap ?? 0) / 100)}.
                </div>
              </div>
            ) : (
              <ReplayEmptyState text={buildReplayEmptyState(output.replaySeries, selectedBucket?.id, selectedBucket?.label)} />
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ReplayMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${emphasis ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
        {value}
      </div>
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
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm">
      <div className="font-semibold">{label}</div>
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

function ReplayEmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm text-[var(--color-text-muted)]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function formatSignedPoints(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}
