"use client";

import React from "react";
import { Panel } from "@/components/panel";

const quickSteps = [
  "Start with Executive Brief to get the decision-relevant story in under 30 seconds.",
  "Scan Evidence for new developments and app-detected shifts.",
  "Open Source Coverage when you need to verify the original reporting fast.",
  "Track What Changed Recently for momentum shifts, not repeated noise.",
];

const legend = [
  { label: "High trust", body: "Multiple strong sources or direct official evidence support the item." },
  { label: "Developing", body: "The item is meaningful but still moving; watch for confirmation or contradiction." },
  { label: "Breaking", body: "Fresh item with possible outside-view relevance; treat speed and uncertainty together." },
  { label: "Unverified", body: "Not enough source support yet. Useful for watchlists, not final decisions." },
];

export function OperatorGuide() {
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const guidedSteps = ["What this is", "Scan the brief", "Read evidence", "Verify sources", "Act or watch"];

  return (
    <div className="space-y-5">
      <Panel
        title="Quick Start"
        subtitle="Understand the workbench in 30 seconds."
        className="bg-gradient-to-br from-[var(--color-panel)] to-[var(--color-surface-muted)]"
      >
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">What this app does</div>
            <p className="mt-3 max-w-3xl text-2xl font-semibold leading-snug tracking-tight">
              SignalOS reads live news, groups related coverage, and highlights what matters for faster decisions.
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
            <div className="text-sm font-semibold">How to use in 30 seconds</div>
            <ol className="mt-4 space-y-3 text-sm text-[var(--color-text-muted)]">
              {quickSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent)]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Panel>

      <Panel title="What Matters Most" subtitle="Ranking logic in plain English.">
        <div className="grid gap-3 md:grid-cols-4">
          <GuideCard title="Recency" body="Fresh items matter more because political markets reprice quickly around new catalysts." />
          <GuideCard title="Credibility" body="Official and high-quality sources outrank ambient chatter." />
          <GuideCard title="Confirmation" body="Multiple independent sources raise confidence; conflicting sources raise uncertainty." />
          <GuideCard title="Impact" body="The app prioritizes developments that can change policy, risk, the story, or the outside view." />
        </div>
      </Panel>

      <Panel title="Understanding Evidence" subtitle="The app reduces noise without hiding judgment.">
        <div className="grid gap-4 lg:grid-cols-2">
          <GuideCard
            title="What is evidence?"
            body="Evidence is a meaningful event or shift: a policy announcement, geopolitical move, story change, or source-backed report."
          />
          <GuideCard
            title="How evidence is found"
            body="The app reads multiple sources, groups similar reports, filters repeated noise, and ranks what matters."
          />
          <GuideCard
            title="Why multiple sources matter"
            body="Single-source items are early. Multi-source groups are stronger. Conflicting coverage means uncertainty is higher."
          />
          <GuideCard
            title="What you should infer"
            body="Use single-source items as watchlist triggers. Use corroborated clusters as stronger evidence. Always click coverage when the decision matters."
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {legend.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="font-semibold">{item.label}</div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="How to Read This Like a Pro" subtitle="The simple pattern used by fast operators.">
        <div className="grid gap-4 lg:grid-cols-3">
          <GuideCard title="Top to bottom" body="Executive Brief gives the big picture. Evidence shows live developments. Source Coverage verifies the claim." />
          <GuideCard title="Time sensitivity" body="New Since Last Check matters most. Older items decay unless they become corroborated or contradict the thesis." />
          <GuideCard title="Decision mindset" body="Do not ask only what happened. Ask what changed, why it matters, and what would force a different decision." />
        </div>
      </Panel>

      <Panel title="Guided Mode" subtitle="A skippable 5-step walkthrough without blocking the main workflow.">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setGuidedStep(0);
              setGuideOpen(true);
            }}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            Start guided mode
          </button>
          <span className="text-sm text-[var(--color-text-muted)]">Use this before showing the terminal to someone new.</span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {guidedSteps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Step {index + 1}</div>
              <div className="mt-2 font-semibold">{step}</div>
            </div>
          ))}
        </div>
      </Panel>

      {guideOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-[32px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl">
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Guided Mode · Step {guidedStep + 1} of {guidedSteps.length}</div>
            <h2 className="mt-3 text-2xl font-semibold">{guidedSteps[guidedStep]}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{guidedCopy[guidedStep]}</p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                Skip
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={guidedStep === 0}
                  onClick={() => setGuidedStep((step) => Math.max(0, step - 1))}
                  className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (guidedStep === guidedSteps.length - 1) {
                      setGuideOpen(false);
                      return;
                    }
                    setGuidedStep((step) => step + 1);
                  }}
                  className="rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)]"
                >
                  {guidedStep === guidedSteps.length - 1 ? "Done" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const guidedCopy = [
  "This is an AI automation demo. It groups source-backed evidence and shows what changed, why it matters, and what to watch next.",
  "Start with the Executive Brief. It is the fastest way to catch the decision-relevant story without reading the whole timeline.",
  "Use Evidence and Narrative Tracker to see whether a development is early, developing, or confirmed across sources.",
  "Click Source Coverage before acting. Source links are the trust layer, especially for fast-moving geopolitical claims.",
  "Decide whether the item is a trade, watch, or no-action event. The goal is not more news; it is cleaner decisions under uncertainty.",
];

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}
