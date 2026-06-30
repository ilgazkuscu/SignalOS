"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { DashboardPayload, MarketId } from "@/lib/types/domain";

type JournalTrade = {
  id: string;
  marketId: MarketId;
  stance: "LONG_YES" | "LONG_NO";
  entryPrice: number;
  exitPrice?: number;
  size: "FULL" | "HALF" | "SMALL";
  thesis: string;
  catalyst: string;
  invalidation: string;
  openedAt: string;
  closedAt?: string;
  outcome: "open" | "win" | "loss" | "scratch";
};

const storageKey = "iran-ops:trade-journal";

export function TradeJournal({ dashboard: initialDashboard }: { dashboard: DashboardPayload }) {
  const [dashboard, setDashboard] = React.useState(initialDashboard);
  const [trades, setTrades] = React.useState<JournalTrade[]>([]);
  const [form, setForm] = React.useState({
    marketId: dashboard.markets[0]?.id ?? "apr-21",
    stance: "LONG_YES" as JournalTrade["stance"],
    entryPrice: String(dashboard.marketSnapshots[0]?.yesPrice ?? 0.25),
    size: "SMALL" as JournalTrade["size"],
    thesis: "",
    catalyst: "",
    invalidation: "",
  });

  React.useEffect(() => {
    setDashboard(initialDashboard);
  }, [initialDashboard]);

  React.useEffect(() => {
    let cancelled = false;

    const refreshDashboard = async () => {
      try {
        const response = await fetch(`/api/dashboard?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as DashboardPayload;
        if (!cancelled) setDashboard(next);
      } catch {
        // Keep the server-rendered journal context on screen.
      }
    };

    void refreshDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTrades(JSON.parse(saved) as JournalTrade[]);
    } catch {
      setTrades([]);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(trades));
  }, [trades]);

  const closedTrades = trades.filter((trade) => trade.outcome !== "open");
  const totalPnl = closedTrades.reduce((sum, trade) => sum + pnlFor(trade), 0);
  const wins = closedTrades.filter((trade) => pnlFor(trade) > 0).length;

  const openTrade = () => {
    const entryPrice = Number(form.entryPrice);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || entryPrice >= 1) return;
    setTrades((current) => [
      {
        id: `trade-${Date.now()}`,
        marketId: form.marketId as MarketId,
        stance: form.stance,
        entryPrice,
        size: form.size,
        thesis: form.thesis || "No thesis entered.",
        catalyst: form.catalyst || "No catalyst entered.",
        invalidation: form.invalidation || "No invalidation entered.",
        openedAt: new Date().toISOString(),
        outcome: "open",
      },
      ...current,
    ]);
  };

  const closeTrade = (trade: JournalTrade) => {
    const exit = window.prompt("Exit YES price, 0-1", String(latestPriceFor(dashboard, trade.marketId)));
    if (!exit) return;
    const exitPrice = Number(exit);
    if (!Number.isFinite(exitPrice) || exitPrice < 0 || exitPrice > 1) return;
    const closed = { ...trade, exitPrice, closedAt: new Date().toISOString() };
    const pnl = pnlFor(closed);
    setTrades((current) =>
      current.map((item) =>
        item.id === trade.id
          ? {
              ...closed,
              outcome: Math.abs(pnl) < 0.005 ? "scratch" : pnl > 0 ? "win" : "loss",
            }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <Panel title="Decision Log" subtitle="Save decisions, reasons, and outcomes.">
        <div className="grid gap-3 md:grid-cols-4">
          <JournalStat label="Total decisions" value={String(trades.length)} />
          <JournalStat label="Open reviews" value={String(trades.filter((trade) => trade.outcome === "open").length)} />
          <JournalStat label="Hit rate" value={closedTrades.length ? `${((wins / closedTrades.length) * 100).toFixed(0)}%` : "n/a"} />
          <JournalStat label="Closed result" value={`${totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl * 100).toFixed(1)} pts`} />
        </div>
      </Panel>

      <Panel title="Add Decision" subtitle="Write the reason before acting. Review it later.">
        <div className="grid gap-3 md:grid-cols-3">
          <Select label="Date" value={form.marketId} onChange={(value) => setForm((current) => ({ ...current, marketId: value as MarketId }))} options={dashboard.markets.map((market) => [market.id, market.label])} />
          <Select label="Direction" value={form.stance} onChange={(value) => setForm((current) => ({ ...current, stance: value as JournalTrade["stance"] }))} options={[["LONG_YES", "More likely"], ["LONG_NO", "Less likely"]]} />
          <Select label="Size" value={form.size} onChange={(value) => setForm((current) => ({ ...current, size: value as JournalTrade["size"] }))} options={[["FULL", "FULL"], ["HALF", "HALF"], ["SMALL", "SMALL"]]} />
          <label className="block text-sm">
            <span className="mb-2 block font-semibold">Starting price</span>
            <input value={form.entryPrice} onChange={(event) => setForm((current) => ({ ...current, entryPrice: event.target.value }))} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2" />
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <TextArea label="Reason" value={form.thesis} onChange={(value) => setForm((current) => ({ ...current, thesis: value }))} />
          <TextArea label="Trigger" value={form.catalyst} onChange={(value) => setForm((current) => ({ ...current, catalyst: value }))} />
          <TextArea label="What would prove it wrong?" value={form.invalidation} onChange={(value) => setForm((current) => ({ ...current, invalidation: value }))} />
        </div>
        <button type="button" onClick={openTrade} className="mt-4 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]">
          Save decision
        </button>
      </Panel>

      <Panel title="Decision History" subtitle="Newest first. Simple review, not accounting.">
        <div className="space-y-3">
          {trades.length ? (
            trades.map((trade) => (
              <div key={trade.id} className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{trade.marketId} · {trade.size}</div>
                    <div className="mt-1 text-lg font-semibold">{trade.stance.replace("_", " ")}</div>
                    <div className="mt-1 text-sm text-[var(--color-text-muted)]">Start {(trade.entryPrice * 100).toFixed(1)}% {trade.exitPrice !== undefined ? `-> End ${(trade.exitPrice * 100).toFixed(1)}%` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{trade.outcome.toUpperCase()}</div>
                    <div className={pnlFor(trade) >= 0 ? "text-[var(--color-positive-text)]" : "text-[var(--color-danger-text)]"}>{signedPts(pnlFor(trade))}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-[var(--color-text-muted)]">
                  <p><span className="font-semibold text-[var(--color-text)]">Reason: </span>{trade.thesis}</p>
                  <p><span className="font-semibold text-[var(--color-text)]">Trigger: </span>{trade.catalyst}</p>
                  <p><span className="font-semibold text-[var(--color-text)]">Wrong if: </span>{trade.invalidation}</p>
                </div>
                {trade.outcome === "open" ? (
                  <button type="button" onClick={() => closeTrade(trade)} className="mt-4 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-accent)]">
                    Close decision
                  </button>
                ) : (
                  <div className="mt-4 rounded-2xl bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-muted)]">{lessonFor(trade)}</div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">No decisions saved yet.</div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function latestPriceFor(dashboard: DashboardPayload, marketId: MarketId) {
  return dashboard.marketSnapshots.find((snapshot) => snapshot.marketId === marketId)?.yesPrice ?? 0.5;
}

function pnlFor(trade: JournalTrade) {
  if (trade.exitPrice === undefined) return 0;
  return trade.stance === "LONG_YES" ? trade.exitPrice - trade.entryPrice : trade.entryPrice - trade.exitPrice;
}

function signedPts(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

function lessonFor(trade: JournalTrade) {
  if (trade.outcome === "win") return "Worked: review whether the expected trigger happened.";
  if (trade.outcome === "loss") return "Missed: save the pattern and improve the rule.";
  return "Flat: the evidence did not become strong enough.";
}

function JournalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2" />
    </label>
  );
}
