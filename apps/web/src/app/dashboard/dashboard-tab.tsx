"use client";

import React from "react";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FamilyHeaderStrip } from "@/components/family-header-strip";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";
import { formatDateTimeEt, relativeTimeFrom } from "@/lib/utils/time";

interface Model2Payload {
  phase: {
    phase: number;
    posterior: number[];
    features: Record<string, number>;
    time_to_kinetic: {
      within_24h: number;
      within_72h: number;
      within_7d: number;
      within_30d: number;
    };
  };
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function signedGap(value: number) {
  const points = Math.round(value * 100);
  return `${points > 0 ? "+" : ""}${points}pts`;
}

function resolutionLabel(outcome: "yes" | "no" | null | undefined) {
  if (outcome === "yes") return "Resolved YES";
  if (outcome === "no") return "Resolved NO";
  return "Closed";
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateRisk(daysToDeadline: number, model2: Model2Payload["phase"]) {
  const horizons = [
    { days: 1, value: model2.time_to_kinetic.within_24h },
    { days: 3, value: model2.time_to_kinetic.within_72h },
    { days: 7, value: model2.time_to_kinetic.within_7d },
    { days: 30, value: model2.time_to_kinetic.within_30d },
  ];

  if (daysToDeadline <= horizons[0].days) return horizons[0].value;

  for (let index = 1; index < horizons.length; index += 1) {
    const left = horizons[index - 1];
    const right = horizons[index];
    if (daysToDeadline <= right.days) {
      const t = (daysToDeadline - left.days) / (right.days - left.days);
      return left.value + (right.value - left.value) * t;
    }
  }

  const tail = horizons[horizons.length - 1].value;
  const extension = Math.min(0.12, Math.max(0, daysToDeadline - 30) * 0.002);
  return clamp(tail + extension);
}

export function model2ProbabilityForBucket(bucket: FamilyEngineOutput["buckets"][number], model2: Model2Payload["phase"], nowMs = Date.now()) {
  if (!bucket.deadlineAt) return null;

  const daysToDeadline = Math.max(
    0,
    Math.ceil((new Date(bucket.deadlineAt).getTime() - nowMs) / (1000 * 60 * 60 * 24)),
  );
  const kineticRisk = interpolateRisk(daysToDeadline, model2);
  const calmPosterior = (model2.posterior[0] ?? 0) + (model2.posterior[1] ?? 0) + (model2.posterior[2] ?? 0) * 0.5;
  const triggerPenalty =
    Number(model2.features.p3_trigger ?? 0) * 0.08 +
    Number(model2.features.p4_trigger ?? 0) * 0.14 +
    Number(model2.features.trump_two_weeks_pattern ?? 0) * 0.04;
  const deescalationScore = clamp(0.18 + (1 - kineticRisk) * 0.42 + calmPosterior * 0.3 - triggerPenalty);
  const timeFactor = clamp(1 - Math.exp(-daysToDeadline / 18));

  return clamp(0.03 + deescalationScore * timeFactor);
}

export function DashboardTab({
  family,
  output,
  model2Data,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
  model2Data?: Model2Payload | null;
}) {
  const model2 = model2Data ?? null;

  const bucketsWithModel2 = output.buckets.map((bucket) => ({
    ...bucket,
    model2Probability: model2 ? model2ProbabilityForBucket(bucket, model2.phase) : null,
  }));
  const rankedBuckets = [...bucketsWithModel2].sort((left, right) => {
    const gapDelta = Math.abs(right.gap) - Math.abs(left.gap);
    if (gapDelta !== 0) return gapDelta;
    return right.marketProbability - left.marketProbability;
  });

  let monotonicModel2Floor = 0;
  const chartRows = bucketsWithModel2.map((bucket) => {
    const model2Probability =
      bucket.model2Probability == null ? null : (monotonicModel2Floor = Math.max(monotonicModel2Floor, bucket.model2Probability));

    return {
    label: bucket.label,
    model: Math.round(bucket.modelProbability * 100),
    market: Math.round(bucket.marketProbability * 100),
    model2: model2Probability == null ? null : Math.round(model2Probability * 100),
    gap: Math.round(bucket.gap * 100),
    };
  });

  return (
    <div className="space-y-5">
      <FamilyHeaderStrip family={family} output={output} />
      <CurrentReadPanel family={family} output={output} rankedBuckets={rankedBuckets} />

      {chartRows.length ? (
        <div className="grid gap-5">
          <Panel title={`${family.displayName} Outside View`} subtitle="Prediction compared with the outside view by date.">
            <div className="overflow-x-auto">
              <div className="h-[320px] min-w-[640px] sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows} margin={{ top: 12, right: 18, left: -18, bottom: 4 }}>
                    <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="market"
                      name="Outside view"
                      stroke="var(--color-chart-market)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="model"
                      name="Prediction"
                      stroke="var(--color-chart-model)"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="model2"
                      legendType="none"
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth={4}
                      strokeDasharray="6 4"
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="model2"
                      name="Advanced check"
                      stroke="#000000"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      <Panel title="Date View" subtitle="Dates ranked by the largest gap.">
        {bucketsWithModel2.length ? (
          <div className="space-y-2">
            {rankedBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className="grid gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 md:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,0.55fr))]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--color-text)]">{bucket.label}</div>
                    <span className="rounded-full bg-[var(--color-panel)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {bucket.role}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">Date weight {bucket.weight.toFixed(2)}</div>
                </div>
                <LadderMetric label="Prediction" value={pct(bucket.modelProbability)} />
                <LadderMetric label="Advanced check" value={bucket.model2Probability == null ? "n/a" : pct(bucket.model2Probability)} />
                <LadderMetric label="Outside view" value={pct(bucket.marketProbability)} />
                <LadderMetric label="Gap" value={signedGap(bucket.gap)} emphasis />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            No open dates remain here. The board is empty instead of showing stale numbers.
          </div>
        )}
      </Panel>

      {output.closedBuckets.length ? (
        <Panel title="Closed Dates" subtitle="Closed dates are kept for proof, not active decisions.">
          <div className="space-y-2">
            {output.closedBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className="grid gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 md:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.55fr))]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--color-text)]">{bucket.label}</div>
                    <span className="rounded-full bg-[var(--color-panel)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {resolutionLabel(bucket.resolvedOutcome)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {bucket.closedAt ? `Closed ${new Date(bucket.closedAt).toLocaleString()}` : "Closed by deadline"}
                  </div>
                </div>
                <LadderMetric label="Final outside view" value={pct(bucket.marketProbability)} />
                <LadderMetric label="Archived prediction" value={pct(bucket.modelProbability)} />
                <LadderMetric label="Archived gap" value={signedGap(bucket.gap)} emphasis />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function CurrentReadPanel({
  family,
  output,
  rankedBuckets,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
  rankedBuckets: Array<FamilyEngineOutput["buckets"][number] & { model2Probability: number | null }>;
}) {
  const topBucket = rankedBuckets[0] ?? null;
  const updateTime = formatDateTimeEt(output.generatedAt);
  const updateAge = relativeTimeFrom(output.generatedAt, Date.now());
  const gapDirection = topBucket && topBucket.gap >= 0 ? "above" : "below";

  return (
    <section className="grid gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Current Read</div>
        {topBucket ? (
          <>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-[var(--color-text)]">
              Biggest live disagreement: {topBucket.label} is {signedGap(topBucket.gap)}.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              The app is {gapDirection} the outside view here: prediction {pct(topBucket.modelProbability)}, outside view {pct(topBucket.marketProbability)}.
              Start with this date, then check News and Evidence before treating the gap as fresh.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-[var(--color-text)]">
              No live contracts remain for {family.displayName}.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              This view is archive-only now. Use the closed rows for proof context, or switch Current Question back to Hormuz Closure.
            </p>
          </>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <ReadStat label="Data" value="Live" tone="positive" />
        <ReadStat label="Updated" value={`${updateTime} ET`} detail={updateAge} />
        <ReadStat label="Open" value={`${output.buckets.length}`} detail="tradable rows" />
        <ReadStat label="Closed" value={`${output.closedBuckets.length}`} detail="archive rows" />
      </div>
    </section>
  );
}

function ReadStat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "positive";
}) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${tone === "positive" ? "text-[var(--color-positive-text)]" : "text-[var(--color-text)]"}`}>
        {value}
      </div>
      {detail ? <div className="mt-1 text-xs text-[var(--color-text-muted)]">{detail}</div> : null}
    </div>
  );
}

function LadderMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${emphasis ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
        {value}
      </div>
    </div>
  );
}
