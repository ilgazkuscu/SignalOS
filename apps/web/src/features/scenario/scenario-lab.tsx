"use client";

import React from "react";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import { friendlyCopy, friendlySignalLabel } from "@/lib/friendly-signal-copy";
import type { BeliefState, DashboardPayload, ScenarioDefinition, WeightProfileKey } from "@/lib/types/domain";

export function ScenarioLab({
  scenarios,
  baseline: initialBaseline,
}: {
  scenarios: ScenarioDefinition[];
  baseline: BeliefState;
}) {
  const [baseline, setBaseline] = useState(initialBaseline);
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0]?.id ?? "");
  const [profileKey, setProfileKey] = useState<WeightProfileKey>("balanced");
  const [result, setResult] = useState<BeliefState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId),
    [scenarios, selectedScenarioId],
  );

  React.useEffect(() => {
    setBaseline(initialBaseline);
  }, [initialBaseline]);

  React.useEffect(() => {
    let cancelled = false;

    const refreshBaseline = async () => {
      try {
        const response = await fetch(`/api/dashboard?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as DashboardPayload;
        if (!cancelled) setBaseline(next.currentBelief);
      } catch {
        // Keep the server-rendered scenario baseline on screen.
      }
    };

    void refreshBaseline();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSimulation = () => {
    if (!selectedScenario) return;

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/scenarios/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileKey,
            events: selectedScenario.events,
          }),
        });

        if (!response.ok) {
          throw new Error(`Scenario request failed with ${response.status}`);
        }

        setResult((await response.json()) as BeliefState);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Scenario request failed.");
      }
    });
  };

  const activeResult = result ?? baseline;
  const bucketDeltaRows = Object.entries(activeResult.yesProbabilityByContract)
    .map(([marketId, scenarioValue]) => {
      const baselineValue =
        baseline.yesProbabilityByContract[marketId as keyof typeof baseline.yesProbabilityByContract];

      return {
        marketId,
        scenarioValue,
        baselineValue,
        delta: scenarioValue - baselineValue,
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));

  const realEndDelta = activeResult.trueDeescalationProbability - baseline.trueDeescalationProbability;
  const formalDelta = activeResult.formalAnnouncementProbability - baseline.formalAnnouncementProbability;
  const wordingGapDelta = activeResult.resolutionFrictionScore - baseline.resolutionFrictionScore;
  const strongestBucketShift = bucketDeltaRows[0];
  const scenarioSummary =
    Math.abs(formalDelta) >= Math.abs(realEndDelta)
      ? "This scenario mostly changes the outside view because the public wording gets clearer."
      : "This scenario mostly changes the outside view because the real situation improves.";

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <ErrorBoundary title="Scenario Controls">
        <Panel
          title="Scenario Controls"
          subtitle="Choose a what-if event and see how the prediction changes."
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Scenario</span>
              <select
                aria-label="Scenario selector"
                value={selectedScenarioId}
                onChange={(event) => {
                  setSelectedScenarioId(event.target.value);
                  setResult(null);
                  setError(null);
                }}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Reaction style</span>
              <select
                aria-label="Weight profile selector"
                value={profileKey}
                onChange={(event) => {
                  setProfileKey(event.target.value as WeightProfileKey);
                  setResult(null);
                  setError(null);
                }}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-3"
              >
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="opportunistic">Opportunistic</option>
              </select>
            </label>

            <button
              type="button"
              onClick={runSimulation}
              aria-label="Run scenario"
              className="w-full rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
            >
              {isPending ? "Running scenario..." : "Run scenario"}
            </button>

            {error ? (
              <div className="rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--color-border)] p-4 text-sm">
              <div className="font-semibold">{selectedScenario?.name}</div>
              <p className="mt-2 text-[var(--color-text-muted)]">{selectedScenario?.description}</p>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-text-muted)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning-text)]" />
                The app treats this like new evidence. Conservative reacts slowly. Opportunistic reacts faster.
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>

      <ErrorBoundary title="Scenario Result">
        <Panel
          title="Scenario Result"
          subtitle="Current prediction vs the what-if result."
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Impact Summary</div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{scenarioSummary}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MetricDeltaCard label="Real progress change" delta={realEndDelta} />
                <MetricDeltaCard label="Public wording change" delta={formalDelta} />
                <MetricDeltaCard label="Wording gap change" delta={wordingGapDelta} precision={2} suffix="" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricTile label="Real progress" value={`${(activeResult.trueDeescalationProbability * 100).toFixed(1)}%`} />
              <MetricTile label="Public wording" value={`${(activeResult.formalAnnouncementProbability * 100).toFixed(1)}%`} />
              <MetricTile label="Wording gap" value={activeResult.resolutionFrictionScore.toFixed(2)} />
            </div>

            {strongestBucketShift ? (
              <div className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Biggest date move</div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      {strongestBucketShift.marketId} changed the most versus the current prediction.
                    </div>
                  </div>
                  <SignedBadge delta={strongestBucketShift.delta} />
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                Date outcomes vs current prediction
              </div>
              <div className="space-y-3">
                {bucketDeltaRows.map(({ marketId, scenarioValue, baselineValue, delta }) => (
                  <div key={marketId} className="grid gap-2 md:grid-cols-[120px_1fr_112px] md:items-center">
                    <div className="font-medium">{marketId}</div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-chart-model)]"
                        style={{ width: `${scenarioValue * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-sm">
                      {(scenarioValue * 100).toFixed(1)}% ({delta >= 0 ? "+" : "-"}
                      {Math.abs(delta * 100).toFixed(1)} pts)
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] md:col-span-3">
                      Current {(baselineValue * 100).toFixed(1)}% {"->"} What-if {(scenarioValue * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                Scenario event assumptions
              </div>
              <div className="space-y-3">
                {selectedScenario?.events.map((event) => (
                  <div key={event.title} className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{event.title}</div>
                      <div className="text-sm text-[var(--color-text-muted)]">{friendlySignalLabel(event.family)}</div>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{friendlyCopy(event.rationale)}</p>
                    <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                      Strength {event.magnitude.toFixed(2)} · Trust {(event.confidence * 100).toFixed(0)}% · Reaction {profileKey}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </ErrorBoundary>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function MetricDeltaCard({
  label,
  delta,
  precision = 1,
  suffix = " pts",
}: {
  label: string;
  delta: number;
  precision?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">
        {delta >= 0 ? "+" : "-"}
        {Math.abs(delta * 100).toFixed(precision)}
        {suffix}
      </div>
    </div>
  );
}

function SignedBadge({ delta }: { delta: number }) {
  return (
    <div
      className={`rounded-full px-3 py-2 text-sm font-semibold ${
        delta >= 0
          ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
          : "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
      }`}
    >
      {delta >= 0 ? "+" : "-"}
      {Math.abs(delta * 100).toFixed(1)} pts
    </div>
  );
}
