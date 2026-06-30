"use client";

import React from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

type LedgerItem = {
  id: string;
  day: string;
  headline: string;
  note: string;
  modelUpdated: boolean;
  strongestBucket: string;
  beforeYes: number;
  afterYes: number;
  delta: number;
};

export function SignalOsReplayDemo({
  ledgerItems,
  latestJun30Model,
  latestJun30Market,
}: {
  ledgerItems: LedgerItem[];
  latestJun30Model: number;
  latestJun30Market: number;
}) {
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const current = ledgerItems[index] ?? ledgerItems[0];
  const latestItems = ledgerItems.slice(0, index + 1);

  React.useEffect(() => {
    if (!playing || ledgerItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((value) => {
        if (value >= ledgerItems.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 1100);

    return () => window.clearInterval(timer);
  }, [ledgerItems.length, playing]);

  if (!ledgerItems.length) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-text-muted)]">
        No news proof is available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[8px] border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">News-by-news proof</div>
            <div className="mt-1 text-xs text-slate-600">
              Each step shows one headline and the prediction change.
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label={playing ? "Pause proof" : "Play proof"} onClick={() => setPlaying((value) => !value)} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-slate-950 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-slate-800">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pause" : "Run"}
            </button>
            <button type="button" aria-label="Next proof item" onClick={() => setIndex((value) => Math.min(ledgerItems.length - 1, value + 1))} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:border-slate-500">
              <SkipForward className="h-4 w-4" />
              Next
            </button>
            <button type="button" aria-label="Reset proof" onClick={() => { setPlaying(false); setIndex(0); }} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:border-slate-500">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Metric label="Our prediction" value={`${(latestJun30Model * 100).toFixed(1)}%`} tone="model" />
          <Metric label="Outside view" value={`${(latestJun30Market * 100).toFixed(1)}%`} tone="market" />
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Step {index + 1} of {ledgerItems.length}</div>
              <div className="mt-1 text-lg font-semibold">{formatShortDate(current.day)}</div>
              <div className="mt-2 max-w-xl text-sm text-slate-950">{current.headline}</div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>{current.strongestBucket}</div>
              <div>{current.modelUpdated ? "prediction changed" : "no change"}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Bar label="Before" value={current.beforeYes * 100} className="bg-slate-400" />
            <Bar label="After" value={current.afterYes * 100} className="bg-emerald-600" />
          </div>
          <div className="mt-3 rounded-[8px] border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700">
            Why: {current.note}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {ledgerItems.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPlaying(false);
                setIndex(itemIndex);
              }}
              className={`w-full rounded-[8px] border p-3 text-left transition ${
                itemIndex === index
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                <span className="line-clamp-2">{itemIndex + 1}. {item.headline}</span>
                <span className="shrink-0 font-mono">{formatSignedPct(item.delta)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[8px] border border-slate-200 bg-white p-4 text-slate-950 shadow-sm">
        <div className="mb-4">
          <div className="text-sm font-semibold">News Read</div>
          <div className="mt-1 text-xs text-slate-600">
            News used up to this step.
          </div>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
          {latestItems.length ? latestItems.map((item) => (
            <div key={item.id} className="rounded-[8px] border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold">{item.headline}</div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${item.modelUpdated ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                  {item.modelUpdated ? "Changed" : "Read"}
                </span>
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-700">{item.note}</div>
            </div>
          )) : (
            <div className="rounded-[8px] border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No news was read here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all duration-500 ${className}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
      <span className="text-right font-mono text-slate-700">{value.toFixed(1)}%</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "model" | "market" }) {
  return (
    <div className={`rounded-[8px] border p-4 ${tone === "model" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-600">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function formatShortDate(day: string) {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSignedPct(value: number) {
  const pct = value * 100;
  return `${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)} pts`;
}
