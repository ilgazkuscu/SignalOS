import React from "react";
import { ExternalLink } from "lucide-react";
import type { FamilyEngineOutput, MarketFamily } from "@/engine/family";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function signedGap(value: number) {
  const points = Math.round(value * 100);
  return `${points > 0 ? "+" : ""}${points}pts`;
}

export function FamilyHeaderStrip({
  family,
  output,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
}) {
  const aggregateTone =
    output.gap > 0
      ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
      : output.gap < 0
        ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
        : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]";
  const focusTone =
    output.primaryBucketGap > 0
      ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
      : output.primaryBucketGap < 0
        ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
        : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]";
  const primaryBucket = family.bucketOrder.find((bucket) => bucket.id === family.primaryReplayBucketId) ?? family.bucketOrder[0];
  const polymarketUrl = family.polymarketEventUrl ?? (primaryBucket?.polymarketSlug ? `https://polymarket.com/market/${primaryBucket.polymarketSlug}` : null);
  const hasOpenBuckets = output.buckets.length > 0;

  return (
    <section className="grid gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5 md:grid-cols-[1.3fr_0.7fr]">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{output.displayName}</div>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{output.shortThesis}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{output.description}</p>
        {polymarketUrl ? (
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            View on Polymarket
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      {hasOpenBuckets ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Horizon" value={output.horizonLabel} />
          <MetricCard label={`${output.primaryBucketLabel} Model`} value={pct(output.primaryBucketModelProbability)} />
          <MetricCard label={`${output.primaryBucketLabel} Market`} value={pct(output.primaryBucketMarketProbability)} />
          <div className={`rounded-[8px] border border-[var(--color-border)] px-4 py-3 ${focusTone}`}>
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-70">{output.primaryBucketLabel} Gap</div>
            <div className="mt-1 text-sm font-semibold sm:text-base">{signedGap(output.primaryBucketGap)}</div>
          </div>
          <MetricCard label="Aggregate Model" value={pct(output.aggregateModelProbability)} />
          <MetricCard label="Aggregate Market" value={pct(output.aggregateMarketProbability)} />
          <div className={`rounded-[8px] border border-[var(--color-border)] px-4 py-3 ${aggregateTone}`}>
            <div className="text-[11px] uppercase tracking-[0.22em] opacity-70">Aggregate Gap</div>
            <div className="mt-1 text-sm font-semibold sm:text-base">{signedGap(output.gap)}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
          No open contracts remain in this ladder. Closed markets are shown as archive rows and are excluded from active edge, EV, and sizing calculations.
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--color-text)] sm:text-base">{value}</div>
    </div>
  );
}
