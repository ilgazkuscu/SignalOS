"use client";

import React, { useEffect, useMemo, useState } from "react";
import katex from "katex";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorBoundary } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import type { DashboardPayload } from "@/lib/types/domain";

export function ModelExplainer({ data: initialData }: { data: DashboardPayload }) {
  const [data, setData] = useState(initialData);
  const [selectedMarketId, setSelectedMarketId] = useState(data.markets[data.markets.length - 1]?.id);
  const [hazardPercent, setHazardPercent] = useState(
    Number((data.currentBelief.dailyRealDeescalationHazard * 100).toFixed(1)),
  );

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;

    const refreshModel = async () => {
      try {
        const response = await fetch(`/api/dashboard?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as DashboardPayload;
        if (!cancelled) setData(next);
      } catch {
        // Keep the server-rendered model payload on screen.
      }
    };

    void refreshModel();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeMarket = data.markets.find((market) => market.id === selectedMarketId) ?? data.markets[data.markets.length - 1];
  const decomposition = data.currentBelief.decompositionByContract[activeMarket.id];
  const hazardCurve = useMemo(() => {
    const dailyRate = hazardPercent / 100;
    return Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      return {
        day,
        cumulative: Number(((1 - (1 - dailyRate) ** day) * 100).toFixed(1)),
      };
    });
  }, [hazardPercent]);

  const signalFlow = data.currentBelief.topPositiveDrivers.concat(data.currentBelief.topNegativeDrivers).slice(0, 6).map((driver) => ({
    signal: driver.title,
    contribution: Number((driver.pointsDelta * 100).toFixed(1)),
  }));

  const alternativeModels = [
    {
      id: "single-probability",
      name: "One-Number Prediction",
      score: 46,
      fit: "Too simple here",
      summary:
        "Gives one answer. Fast, but misses why wording matters.",
      strengths: ["Fast", "Easy to explain", "Good for simple questions"],
      weaknesses: [
        "Misses rule wording",
        "Can overreact to headlines",
        "Does not explain edge cases",
      ],
      tone: "var(--color-chart-negative)",
    },
    {
      id: "black-box",
      name: "Black-Box AI Model",
      score: 58,
      fit: "Powerful, but hard to trust",
      summary:
        "Could read many items, but it is harder to explain in an interview or live decision.",
      strengths: ["Can use many inputs", "Can improve with history", "Good at ranking evidence"],
      weaknesses: [
        "Hard to explain",
        "Needs lots of examples",
        "Hard to defend under pressure",
      ],
      tone: "var(--color-chart-warning)",
    },
    {
      id: "timing-only",
      name: "Timing Model",
      score: 72,
      fit: "Good for timing, not enough alone",
      summary:
        "Good at asking when something may happen. Not enough for rule-based outcomes.",
      strengths: ["Good for deadlines", "Easy to chart", "Good for time curves"],
      weaknesses: [
        "Misses wording",
        "Needs extra checks",
        "Can hide the reason",
      ],
      tone: "var(--color-accent)",
    },
    {
      id: "two-step",
      name: "Two-Step Prediction",
      score: 91,
      fit: "Best fit here",
      summary:
        "First asks what happened. Then asks if it was officially confirmed. That matches the real decision.",
      strengths: [
        "Matches the rules",
        "Easy to explain",
        "Handles vague wording",
      ],
      weaknesses: [
        "More parts than one number",
        "Needs judgment",
        "Still a demo model",
      ],
      tone: "var(--color-chart-model)",
    },
  ];

  const modelComparisonChart = alternativeModels.map((model) => ({
    model: model.name.replace(" Model", "").replace(" / Survival", ""),
    contractFit: model.score,
    explanation: model.id === "two-step" ? 95 : model.id === "timing-only" ? 66 : model.id === "black-box" ? 41 : 28,
    robustness: model.id === "two-step" ? 84 : model.id === "timing-only" ? 71 : model.id === "black-box" ? 62 : 54,
  }));

  const formulaTerms = [
    {
      label: "Final prediction",
      value: `${(decomposition.yesProbability * 100).toFixed(1)}%`,
      body: "The final number shown to the user.",
      tone: "var(--color-chart-model)",
    },
    {
      label: "Real-world progress",
      value: `${(decomposition.realEndByDate * 100).toFixed(1)}%`,
      body: "Whether the real situation is improving.",
      tone: "var(--color-accent)",
    },
    {
      label: "Official confirmation",
      value: `${(decomposition.announcementGivenEnd * 100).toFixed(1)}%`,
      body: "Whether someone official says it clearly enough.",
      tone: "var(--color-chart-warning)",
    },
    {
      label: "Wording gap",
      value: decomposition.frictionMultiplier.toFixed(2),
      body: "A discount when the news is strong but the wording is vague.",
      tone: "var(--color-chart-negative)",
    },
  ];

  const decompositionRows = [
    {
      latex: String.raw`P(\mathrm{real\_end}\ \mathrm{by}\ T)`,
      label: "Real-world progress",
      value: `${roundPct(decomposition.realEndByDate)}%`,
      detail: "How much the real situation appears to have improved.",
    },
    {
      latex: String.raw`P(\mathrm{announce}\mid \mathrm{real\_end})`,
      label: "Official confirmation",
      value: `${roundPct(decomposition.announcementGivenEnd)}%`,
      detail: "How likely it is that clear public wording appears.",
    },
    {
      latex: String.raw`1-\mathrm{wording\ gap}`,
      label: "Wording gap",
      value: decomposition.frictionMultiplier.toFixed(2),
      detail: "How much vague wording reduces the prediction.",
    },
    {
      latex: String.raw`P(\mathrm{YES}\ \mathrm{by}\ T)`,
      label: "Result",
      value: `${roundPct(decomposition.yesProbability)}%`,
      detail: "The final prediction after the checks are combined.",
    },
  ];

  const selectedDriver = data.currentBelief.topPositiveDrivers[0] ?? data.currentBelief.topNegativeDrivers[0];
  const driverMagnitude = selectedDriver ? Math.abs(selectedDriver.pointsDelta) * 100 : 0;
  const recencyFactor = selectedDriver
    ? Math.max(
        0.35,
        Math.min(
          1,
          1 - selectedDriver.correlatedPenaltyApplied - selectedDriver.contradictionPenaltyApplied - (selectedDriver.stale ? 0.18 : 0.04),
        ),
      ).toFixed(2)
    : "0.76";
  const weightingExample = selectedDriver
    ? {
        name: selectedDriver.title,
        latex: String.raw`\mathrm{contribution}=m\times c\times r\times w_f`,
        expanded: `${driverMagnitude.toFixed(1)} × ${(selectedDriver.confidence * 100).toFixed(0)}% × ${recencyFactor} × family weight`,
        effect: `${selectedDriver.pointsDelta >= 0 ? "+" : "-"}${Math.abs(selectedDriver.pointsDelta * 100).toFixed(1)} pts`,
      }
    : {
        name: "deescalatory_tone",
        latex: String.raw`\mathrm{contribution}=m\times c\times r\times w_f`,
        expanded: "58 × 84% × 0.76 × 20%",
        effect: "+8.9 pts",
      };

  const coreNumbers = [
    {
      symbol: String.raw`P(\mathrm{real\_end}\ \mathrm{by}\ T)`,
      name: "Real-world progress",
      value: `${(decomposition.realEndByDate * 100).toFixed(1)}%`,
      meaning: "Chance the real situation has improved by the deadline.",
    },
    {
      symbol: String.raw`P(\mathrm{announce}\mid \mathrm{real\_end})`,
      name: "Official confirmation",
      value: `${(decomposition.announcementGivenEnd * 100).toFixed(1)}%`,
      meaning: "Chance that clear public wording appears.",
    },
    {
      symbol: String.raw`\mathrm{wording\ gap}`,
      name: "Wording gap",
      value: `${(1 - decomposition.frictionMultiplier).toFixed(2)}`,
      meaning: "Penalty when reality and wording do not match.",
    },
    {
      symbol: "T",
      name: "Date",
      value: activeMarket.label,
      meaning: "The date being checked.",
    },
  ];

  const numericEquation = `${decomposition.realEndByDate.toFixed(3)} × ${decomposition.announcementGivenEnd.toFixed(3)} × ${decomposition.frictionMultiplier.toFixed(2)} = ${decomposition.yesProbability.toFixed(3)}`;
  const rawProduct = decomposition.realEndByDate * decomposition.announcementGivenEnd * decomposition.frictionMultiplier;
  const displayedLift = decomposition.yesProbability - rawProduct;
  const calculationRows = [
    {
      label: "1. Real-world progress",
      value: decomposition.realEndByDate,
      explanation:
        "Checks whether the real situation is improving.",
    },
    {
      label: "2. Official confirmation",
      value: decomposition.announcementGivenEnd,
      explanation:
        "Checks whether the public wording is clear enough.",
    },
    {
      label: "3. Wording gap",
      value: decomposition.frictionMultiplier,
      explanation:
        "Reduces the prediction when the wording is vague.",
    },
    {
      label: "4. Raw product",
      value: rawProduct,
      explanation:
        "Combines the three checks.",
    },
    {
      label: "5. Final prediction",
      value: decomposition.yesProbability,
      explanation:
        displayedLift > 0.004
          ? "The final number is lifted slightly because later dates should not be lower than earlier dates."
          : "The final number is the combined result after rounding.",
    },
  ];
  const catalystCards = [
    {
      title: "Biggest positive trigger",
      body: "A clear official statement would raise the prediction fast.",
    },
    {
      title: "Biggest negative trigger",
      body: "A new strike or casualty report would lower the prediction fast.",
    },
    {
      title: "Main thing to watch",
      body: "The real question is whether official wording becomes clear.",
    },
  ];

  return (
    <div className="space-y-5">
      <ErrorBoundary title="Core Idea">
        <Panel
          title="Core Idea"
          subtitle="The app checks what happened and whether it was clearly confirmed."
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[var(--color-border)] p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <StageCard title="What Happened" body="Did the real situation improve?" />
                <StageCard title="What Was Said" body="Did an official source say it clearly?" />
                <StageCard title="Final Prediction" body="Both checks shape the final number." />
              </div>
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                The prediction only rises strongly when the facts and the wording both support it.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Prediction</div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">Choose the date to inspect.</div>
                </div>
                <select
                  aria-label="Model bucket selector"
                  value={activeMarket.id}
                  onChange={(event) => setSelectedMarketId(event.target.value as typeof activeMarket.id)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text)]"
                >
                  {data.markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {market.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-sm text-[var(--color-text-muted)]">
                Simple rule: real-world progress plus clear official wording creates the final prediction.
              </div>
              <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Number Check</div>
                <div className="mt-2 font-mono text-base font-semibold text-[var(--color-text)]">{numericEquation}</div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  For {activeMarket.label}, the app combines real-world progress, official wording, and the wording gap.
                </p>
              </div>
              <div className="mt-4 rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Plain English</div>
                <div className="mt-3 space-y-3">
                  {calculationRows.map((row) => (
                    <div key={row.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="font-semibold">{row.label}</div>
                        <div className="font-mono text-lg font-semibold">
                          {row.label.includes("Wording") ? row.value.toFixed(2) : `${(row.value * 100).toFixed(1)}%`}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{row.explanation}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  Later dates usually have higher predictions because there is more time for events to happen.
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {formulaTerms.map((term) => (
                <div key={term.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-base font-semibold" style={{ color: term.tone }}>{term.label}</div>
                      <div className="text-right text-xl font-semibold">{term.value}</div>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{term.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-[var(--color-text-muted)]">
                Today, {activeMarket.label} uses {roundPct(decomposition.realEndByDate)}% real-world progress, {roundPct(decomposition.announcementGivenEnd)}% official confirmation, and a wording-gap score of {decomposition.frictionMultiplier.toFixed(2)}.
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="The Math">
        <Panel title="Prediction Breakdown" subtitle="The final number in simple parts.">
          <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="grid gap-4 lg:grid-cols-2">
              {coreNumbers.map((item) => (
                <div key={item.symbol} className="rounded-2xl border border-[var(--color-border)] p-4">
                  <LatexInline latex={item.symbol} className="text-sm text-[var(--color-accent)]" />
                  <div className="mt-2 text-lg font-semibold">{item.name}</div>
                  <div className="mt-2 text-3xl font-semibold">{item.value}</div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.meaning}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Live Breakdown</div>
              <div className="mt-4 space-y-3">
                {decompositionRows.map((row, index) => (
                  <div key={row.latex} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Step {index + 1}</div>
                        <div className="mt-1 font-semibold">{row.label}</div>
                      </div>
                      <div className="text-right">
                        <LatexInline latex={row.latex} className="text-sm text-[var(--color-accent)]" />
                        <div className="mt-1 text-2xl font-semibold">{row.value}</div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{row.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Model Choice">
        <Panel
          title="Why This Approach"
          subtitle="It is simple enough to explain and specific enough to be useful."
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {alternativeModels.map((model) => (
                <div
                  key={model.id}
                  className="rounded-2xl border border-[var(--color-border)] p-4"
                  style={{
                    background:
                      model.id === "two-step"
                        ? "linear-gradient(135deg, rgba(45, 212, 191, 0.08), rgba(45, 212, 191, 0.02))"
                        : "var(--color-panel)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{model.name}</div>
                      <div className="mt-1 text-sm" style={{ color: model.tone }}>
                        {model.fit}
                      </div>
                    </div>
                    <div className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm font-semibold">
                      {model.score}/100
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{model.summary}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ModelBulletCard title="Strengths" items={model.strengths} />
                    <ModelBulletCard title="Weaknesses" items={model.weaknesses} />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Comparison</div>
                <div className="mt-4 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                <LineChart data={modelComparisonChart}>
                  <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" />
                      <XAxis dataKey="model" stroke="var(--color-text-muted)" angle={-24} textAnchor="end" height={92} interval={0} tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--color-text-muted)" domain={[0, 100]} tick={{ fontSize: 12 }} width={42} />
                      <Tooltip content={<ModelTooltip />} />
                      <Line type="monotone" dataKey="contractFit" name="Fit" stroke="var(--color-chart-model)" strokeWidth={3} />
                      <Line type="monotone" dataKey="explanation" name="Explainability" stroke="var(--color-chart-market)" strokeWidth={2} />
                      <Line type="monotone" dataKey="robustness" name="Stability" stroke="var(--color-chart-negative)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Recommendation</div>
                <div className="mt-2 text-lg font-semibold">Use the two-step prediction.</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  The app should not trust a headline by itself. It should check what happened and whether the wording is clear.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Signal Flow">
        <Panel title="How News Becomes A Prediction" subtitle="Raw news becomes a score, then a user-facing update.">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-3">
              {[
                "Read news and statements",
                "Find useful evidence",
                "Score strength and freshness",
                "Balance positive and negative items",
                "Update the prediction",
                "Show the result by date",
              ].map((step, index) => (
                <div key={step} className="rounded-2xl border border-[var(--color-border)] p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Step {index + 1}</div>
                  <div className="mt-2 font-semibold">{step}</div>
                </div>
              ))}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Example</div>
                <div className="mt-2 font-semibold">{weightingExample.name}</div>
                <LatexBlock latex={weightingExample.latex} className="mt-3" compact />
                <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                  <div className="font-mono text-sm">{weightingExample.expanded}</div>
                  <div className="mt-2 text-sm text-[var(--color-text-muted)]">
                    After scoring, this changes the prediction by <span className="font-semibold text-[var(--color-text)]">{weightingExample.effect}</span>.
                  </div>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signalFlow}>
                  <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="signal" stroke="var(--color-text-muted)" angle={-24} textAnchor="end" height={96} interval={0} tick={{ fontSize: 10 }} />
                  <YAxis stroke="var(--color-text-muted)" unit=" pt" tick={{ fontSize: 12 }} width={50} />
                  <Tooltip content={<ModelTooltip />} />
                  <Line type="monotone" dataKey="contribution" stroke="var(--color-chart-model)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Timing Curve">
        <Panel title="Timing Curve" subtitle="Small daily chances add up over time.">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="h-80 rounded-2xl border border-[var(--color-border)] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hazardCurve}>
                  <CartesianGrid stroke="var(--color-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--color-text-muted)" unit="%" tick={{ fontSize: 12 }} width={44} />
                  <Tooltip content={<ModelTooltip />} />
                  <Area type="monotone" dataKey="cumulative" stroke="var(--color-chart-model)" fill="var(--color-accent-soft)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] p-4">
                <label htmlFor="daily-chance-slider" className="text-sm font-semibold">
                  Daily chance: {hazardPercent.toFixed(1)}%
                </label>
                <input
                  id="daily-chance-slider"
                  aria-label="Daily chance slider"
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.1}
                  value={hazardPercent}
                  onChange={(event) => setHazardPercent(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                  Imagine checking every day and asking, &quot;Did the event happen today?&quot; The slider changes that daily chance.
                </p>
                <div className="mt-4 space-y-3">
                  <LatexBlock latex={String.raw`P(\mathrm{happens\ by\ day}\ N)=1-(1-\mathrm{daily\_rate})^N`} compact />
                  <LatexBlock latex={String.raw`P_{\mathrm{cum}}(T)=1-e^{-hT}`} compact />
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                <div>By day 6: {hazardCurve[5]?.cumulative.toFixed(1)}%</div>
                <div>By day 21: {hazardCurve[20]?.cumulative.toFixed(1)}%</div>
                <div>By day 30: {hazardCurve[29]?.cumulative.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Why This Model">
        <Panel title="Why This Works" subtitle="Where the approach helps most.">
          <div className="grid gap-4 md:grid-cols-2">
            <RationaleCard
              title="Why split facts and words?"
              body="A situation can improve before anyone says it clearly. The app checks both."
            />
            <RationaleCard
              title="When is it most useful?"
              body="It helps most when the news is improving but the wording is still unclear."
            />
            <RationaleCard
              title="When is it weakest?"
              body="It is weakest during sudden shocks that no news system can see early."
            />
            <RationaleCard
              title="What makes it different?"
              body="It does not just summarize news. It checks if the news should change the decision."
            />
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="What Moves It">
        <Panel title="What Would Move It?" subtitle="The biggest triggers to watch.">
          <div className="grid gap-4 md:grid-cols-3">
            {catalystCards.map((card) => (
              <RationaleCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Parameter Glossary">
        <Panel title="Live Settings" subtitle="Current values used by the prediction.">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--color-text-muted)]">
                <tr>
                  <th className="pb-3 pr-4">Setting</th>
                  <th className="pb-3 pr-4">Value</th>
                  <th className="pb-3 pr-4">Range</th>
                  <th className="pb-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                <GlossaryRow parameter="Daily event chance" value={`${roundPct(data.currentBelief.dailyRealDeescalationHazard)}%`} range="0-15%" />
                <GlossaryRow parameter="Daily statement chance" value={`${roundPct(data.currentBelief.dailyAnnouncementHazard)}%`} range="0-15%" />
                <GlossaryRow parameter="Wording gap" value={data.currentBelief.resolutionFrictionScore.toFixed(2)} range="0-1" />
                <GlossaryRow parameter="Trust score" value={`${roundPct(data.currentBelief.confidenceScore)}%`} range="0-100%" />
                <GlossaryRow parameter="Wording risk" value={`${roundPct(data.currentBelief.wordingRiskScore)}%`} range="0-100%" />
                <GlossaryRow parameter="Statement after event" value={`${roundPct(data.currentBelief.conditionalAnnouncementGivenEndProbability)}%`} range="0-100%" />
              </tbody>
            </table>
          </div>
        </Panel>
      </ErrorBoundary>
    </div>
  );
}

function StageCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function RationaleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function ModelBulletCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 space-y-2 text-sm text-[var(--color-text-muted)]">
        {items.map((item) => (
          <div key={item}>• {item}</div>
        ))}
      </div>
    </div>
  );
}

function GlossaryRow({
  parameter,
  value,
  range,
}: {
  parameter: string;
  value: string;
  range: string;
}) {
  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="py-3 pr-4">{parameter}</td>
      <td className="py-3 pr-4">{value}</td>
      <td className="py-3 pr-4">{range}</td>
      <td className="py-3">Live</td>
    </tr>
  );
}

function ModelTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm">
      <div className="font-semibold">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.value}`} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LatexBlock({
  latex,
  className,
  compact = false,
}: {
  latex: string;
  className?: string;
  compact?: boolean;
}) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
    output: "html",
    strict: "ignore",
  });

  return (
    <div
      className={["overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-[var(--color-text)]", compact ? "py-3" : "py-4", className ?? ""].join(" ")}
      role="img"
      aria-label="Mathematical formula"
    >
      <div
        className="[&_.katex]:text-[1.02rem] md:[&_.katex]:text-[1.16rem] [&_.katex-display]:m-0 [&_.katex]:text-[var(--color-text)]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function LatexInline({
  latex,
  className,
  style,
}: {
  latex: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: false,
    output: "html",
    strict: "ignore",
  });

  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function roundPct(value: number) {
  return Number((value * 100).toFixed(1));
}
