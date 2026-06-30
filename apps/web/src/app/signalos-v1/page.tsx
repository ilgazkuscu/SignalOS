import React from "react";
import { Activity, Bell, Database, LineChart, Radio, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Panel } from "@/components/panel";
import { getReplayPayload } from "@/lib/api/service";
import { SignalOsReplayDemo } from "@/app/signalos-v1/replay-demo";

export const dynamic = "force-dynamic";

const pipeline = [
  {
    icon: Radio,
    title: "Read",
    detail: "SignalOS reads news and prices so people do not have to scan everything manually.",
    stack: "Collect data",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    detail: "It keeps weak items out and keeps useful items in.",
    stack: "Check quality",
  },
  {
    icon: Activity,
    title: "Update",
    detail: "Important items update the prediction and the reason behind it.",
    stack: "Update prediction",
  },
  {
    icon: Bell,
    title: "Decide",
    detail: "The user sees what changed and what to do next.",
    stack: "Show action",
  },
];

const changedSignals = [
  { name: "Official update", previous: "Low", current: "High", delta: "+", tone: "Important" },
  { name: "Source strength", previous: "Medium", current: "High", delta: "+", tone: "Rising" },
  { name: "Prediction gap", previous: "Small", current: "Large", delta: "+", tone: "Review" },
];

const proof = [
  { label: "Alerts created", value: "24", note: "saved with proof" },
  { label: "Useful alerts", value: "58%", note: "matched later moves" },
  { label: "Time saved", value: "42m", note: "less manual reading" },
  { label: "Bad alerts", value: "5", note: "kept visible" },
];

const stack = [
  ["Frontend", "Next.js, TypeScript, Tailwind, shadcn-ready"],
  ["Backend", "FastAPI"],
  ["Database", "Supabase Postgres"],
  ["Quality checks", "Pandera"],
  ["Proof run", "Python + pandas"],
  ["Prediction history", "model_versions table"],
  ["Deploy", "Vercel + Railway"],
  ["Monitor", "logs, health checks, Sentry later"],
];

export default async function SignalOsV1Page() {
  const replay = await getReplayPayload("balanced");
  const latestReplay = replay.history[replay.history.length - 1];
  const latestJun30Model = latestReplay?.belief.yesProbabilityByContract["jun-30"] ?? 0;
  const latestJun30Market = latestReplay?.marketByContract["jun-30"] ?? 0;
  const ledgerItems = (replay.newsEvaluationLedger ?? []).map((item) => ({
    id: item.id,
    day: item.day,
    headline: item.headline,
    note: item.note,
    modelUpdated: item.modelUpdated,
    strongestBucket: item.strongestBucket,
    beforeYes: item.beforeYes,
    afterYes: item.afterYes,
    delta: item.delta,
  }));

  return (
    <div
      className="space-y-5 bg-slate-100 p-3 text-slate-950 sm:p-5"
      style={{
        "--color-bg": "#f1f5f9",
        "--color-panel": "#ffffff",
        "--color-surface-muted": "#f8fafc",
        "--color-border": "#cbd5e1",
        "--color-text": "#0f172a",
        "--color-text-muted": "#475569",
        "--color-accent": "#047857",
        "--color-accent-soft": "#d1fae5",
        "--color-chart-model": "#059669",
        "--color-chart-market": "#d97706",
        "--color-chart-neutral": "#64748b",
      } as React.CSSProperties}
    >
      <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-5 sm:p-7">
            <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              Startup demo
            </div>
            <h1 className="mt-5 max-w-3xl font-condensed text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              SignalOS turns news into a clear decision.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              It reads news, finds what matters, updates the prediction, and explains the next step. Simple story: less manual reading, faster decisions, clear proof.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label="Decision" value="WATCH" tone="warning" />
              <Metric label="Phase shift" value="P2 -> P3" tone="positive" />
              <Metric label="Confidence" value="71%" tone="neutral" />
            </div>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-600">User-facing alert</div>
            <div className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Prediction moved up</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    New deal headlines made a June 30 outcome more likely. Review the position and update the brief. Do not act blindly.
                  </p>
                </div>
                <Bell className="h-5 w-5 shrink-0 text-amber-600" />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <Row label="Action" value="WATCH" />
                <Row label="Impact" value="prediction changed" />
                <Row label="Proof" value="saved" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Panel title="News Proof" subtitle="Click Run. Each step shows one headline and whether it changed the prediction.">
        <SignalOsReplayDemo ledgerItems={ledgerItems} latestJun30Model={latestJun30Model} latestJun30Market={latestJun30Market ?? 0} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <Panel title="How It Works" subtitle="Read, check, update, explain.">
          <div className="grid gap-3 md:grid-cols-2">
            {pipeline.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)]">
                      <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="font-mono text-xs text-[var(--color-text-muted)]">{item.stack}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="User View" subtitle="The short version someone can act on.">
          <div className="space-y-3">
            {changedSignals.map((signal) => (
              <div key={signal.name} className="grid grid-cols-[1fr_auto] gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                <div>
                  <div className="text-sm font-semibold">{signal.name}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {signal.previous} to {signal.current}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-[var(--color-accent)]">{signal.delta}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">{signal.tone}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Proof" subtitle="Why the alert is worth trusting.">
          <div className="grid gap-3 sm:grid-cols-2">
            {proof.map((item) => (
              <div key={item.label} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{item.label}</div>
                <div className="mt-2 text-3xl font-semibold">{item.value}</div>
                <div className="mt-1 text-sm text-[var(--color-text-muted)]">{item.note}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Build Stack" subtitle="Simple stack. Real automation.">
          <div className="grid gap-2 md:grid-cols-2">
            {stack.map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                {label === "Database" ? <Database className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" /> : label === "Backtest" ? <LineChart className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" /> : <Workflow className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />}
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "positive" | "warning" | "neutral" }) {
  const toneClass =
    tone === "positive"
      ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
      : tone === "warning"
        ? "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
        : "bg-[var(--color-surface-muted)] text-[var(--color-text)]";

  return (
    <div className={`rounded-[8px] border border-[var(--color-border)] p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.18em] opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-2">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-mono text-xs text-[var(--color-text)]">{value}</span>
    </div>
  );
}
