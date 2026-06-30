"use client";

import React from "react";
import type { ReplayPayload } from "@/lib/types/domain";

type ConvergenceSummary = {
  prediction: number;
  outsideView: number;
  gap: number;
  newsRead: number;
  changed: number;
};

export function MarketConvergenceCard() {
  const [summary, setSummary] = React.useState<ConvergenceSummary | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/replay", { cache: "no-store" });
        if (!response.ok) throw new Error(`Replay API returned ${response.status}`);
        const payload = (await response.json()) as ReplayPayload;
        if (cancelled) return;
        setSummary(buildSummary(payload));
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div>
        <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          Prediction Check
        </div>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          How close the app is to the outside view.
        </p>
      </div>

      {state === "loading" ? (
        <div className="mt-4 text-sm text-[var(--color-text-muted)]">Loading proof...</div>
      ) : null}

      {state === "error" ? (
        <div className="mt-4 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger-text)]">
          Proof is not available.
        </div>
      ) : null}

      {state === "ready" && summary ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Jun 30 now
            </div>
            <div className="mt-3 grid gap-2">
              <ValueRow label="Our prediction" value={pct(summary.prediction)} />
              <ValueRow label="Outside view" value={pct(summary.outsideView)} />
              <ValueRow label="Gap" value={points(summary.gap)} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-xs text-[var(--color-text-muted)]">
            {summary.newsRead} news items read. {summary.changed} changed the prediction.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildSummary(payload: ReplayPayload): ConvergenceSummary {
  const latest = payload.history[payload.history.length - 1];
  const prediction = latest?.belief.yesProbabilityByContract["jun-30"] ?? 0;
  const outsideView = latest?.marketByContract["jun-30"] ?? 0;
  const newsRead = payload.newsEvaluationLedger?.length ?? 0;
  const changed = payload.newsEvaluationLedger?.filter((item) => item.modelUpdated).length ?? 0;

  return {
    prediction,
    outsideView,
    gap: prediction - outsideView,
    newsRead,
    changed,
  };
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function points(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}
