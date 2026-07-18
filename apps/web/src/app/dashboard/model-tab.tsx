"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";
import type { DashboardPayload } from "@/lib/types/domain";
import { friendlyCopy, friendlySignalLabel } from "@/lib/friendly-signal-copy";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedPoints(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

export function ModelTab({
  family,
  output,
  dashboardData,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
  dashboardData: DashboardPayload;
}) {
  const activeSignalFamilies = Array.from(new Set(output.signals.map((signal) => signal.signalType)));
  const topDrivers = [...dashboardData.currentBelief.topPositiveDrivers, ...dashboardData.currentBelief.topNegativeDrivers]
    .sort((left, right) => Math.abs(right.pointsDelta) - Math.abs(left.pointsDelta))
    .slice(0, 6);
  const selectedBucket = output.buckets.find((bucket) => bucket.id === family.primaryReplayBucketId) ?? output.buckets[0];
  const decomposition = selectedBucket
    ? dashboardData.currentBelief.decompositionByContract[selectedBucket.id as keyof typeof dashboardData.currentBelief.decompositionByContract]
    : null;
  const historical = dashboardData.historicalPatternEngine;

  return (
    <div className="space-y-5">
      <Panel
        title={`${family.displayName} Prediction`}
        subtitle="Short version: the app weighs the same evidence you see in Evidence, then turns it into date-specific odds."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricCard label="Active date" value={selectedBucket?.label ?? "n/a"} />
          <MetricCard label="Prediction" value={pct(output.primaryBucketModelProbability)} />
          <MetricCard label="Outside view" value={pct(output.primaryBucketMarketProbability)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text)]">How it works</div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
              <p>1. Every evidence item is checked for direction, strength, trust, and freshness.</p>
              <p>2. Those effects move the active dates, not one generic number.</p>
              <p>3. The app combines real-world progress, official wording, and wording gap into a prediction.</p>
            </div>
          </div>

          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Evidence types in scope</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeSignalFamilies.map((signalFamily) => (
                <span
                  key={signalFamily}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]"
                >
                  {friendlySignalLabel(signalFamily)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {decomposition ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <MetricCard label="Real end by date" value={pct(decomposition.realEndByDate)} />
            <MetricCard label="Announcement if end" value={pct(decomposition.announcementGivenEnd)} />
            <MetricCard label="Conversion multiplier" value={decomposition.frictionMultiplier.toFixed(2)} />
            <MetricCard label="Resulting YES" value={pct(decomposition.yesProbability)} />
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Historical Pattern Engine"
        subtitle="Theory-led action types compare the current signal mix to recurring U.S. operational patterns like sustainment, retrograde, and genuine termination."
      >
        {historical ? (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-4">
              <MetricCard label="Top action type" value={historical.actionTypeProbabilities[0]?.actionType.replace(/_/g, " ") ?? "n/a"} />
              <MetricCard label="Engine confidence" value={pct(historical.confidence)} />
              <MetricCard label="Real-end delta" value={signedPoints(historical.adjustment.realEndDelta)} />
              <MetricCard label="Friction delta" value={signedPoints(historical.adjustment.frictionDelta)} />
            </div>

            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="text-sm font-semibold text-[var(--color-text)]">Current read</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{historical.summary}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {historical.actionTypeProbabilities.slice(0, 4).map((item) => (
                <div
                  key={item.actionType}
                  className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">{item.actionType.replace(/_/g, " ")}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{item.direction.replace(/_/g, " ")}</div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--color-text)]">{pct(item.probability)}</div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                    <div>Supports: {item.supportingVariables.slice(0, 4).join(", ") || "none"}</div>
                    <div className="mt-1">Contradictions: {item.contradictingVariables.slice(0, 3).join(", ") || "none"}</div>
                    <div className="mt-2">Closest analog: {item.historicalAnalogs[0]?.campaignLabel ?? "n/a"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Historical pattern engine data is unavailable.
          </div>
        )}
      </Panel>

      <Panel title="Top Drivers" subtitle="The strongest evidence pushing the current prediction right now.">
        {topDrivers.length ? (
          <div className="grid gap-3">
            {topDrivers.map((driver) => (
              <div
                key={`${driver.signalId}-${driver.title}`}
                className="grid gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 lg:grid-cols-[minmax(0,1.2fr)_160px]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{friendlySignalLabel(driver.title)}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{friendlySignalLabel(driver.family)}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{friendlyCopy(driver.narrative)}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Contribution</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{signedPoints(driver.pointsDelta)}</div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Trust</div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">{pct(driver.confidence)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            No active drivers available.
          </div>
        )}
      </Panel>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-base font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  );
}
