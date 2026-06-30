"use client";

import React from "react";
import { Panel } from "@/components/panel";

interface SignalOsModelMeta {
  hmm: {
    type?: string;
    n_components?: number;
    covariance_type?: string;
    n_iter?: number;
    startprob?: number[];
    transmat_first_row?: number[];
    means_shape?: number[];
    covars_shape?: number[];
    feature_columns: string[];
    artifact_path?: string;
  };
  survival?: {
    type?: string;
    params_index?: Array<string | string[]>;
    summary_columns?: string[];
    artifact_path?: string;
  };
}

type Model2Data = { model: SignalOsModelMeta; phase: any };

export function Model2Tab({ data: initialData = null }: { data?: Model2Data | null }) {
  if (!initialData) {
    return (
      <Panel title="SignalOS Model2" subtitle="Model2 metadata and phase signal stack.">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Model2 data is unavailable in the shared workspace payload.
        </div>
      </Panel>
    );
  }

  const data = initialData;
  const fallbackMode = data.phase.source === "workspace-derived-fallback";

  const signalRows = [
    {
      section: "Air package",
      title: "Tanker bridge intensity",
      value: Number(data.phase.features.tanker_sortie_z ?? 0).toFixed(2),
      detail: "Rolling z-score for tanker sorties into the theater bridge.",
    },
    {
      section: "Air package",
      title: "B-2 ramp posture",
      value: String(data.phase.features.b2_dg_ramp_count ?? 0),
      detail: "Observed bomber count proxy at Diego Garcia ramp footprint.",
    },
    {
      section: "Maritime posture",
      title: "Carrier stack",
      value: String(data.phase.features.csg_centcom_count ?? 0),
      detail: "Carrier presence estimate in the CENTCOM operating geometry.",
    },
    {
      section: "Diplomatic security",
      title: "Embassy drawdown",
      value: String(data.phase.features.ordered_departure_iraq ?? 0),
      detail: "Ordered departure trigger for Iraq and adjacent diplomatic posture.",
    },
    {
      section: "Partner activity",
      title: "Israeli activity spike",
      value: String(data.phase.features.israeli_activity_spike ?? 0),
      detail: "Partner military tempo signal used in the Iran playbook template.",
    },
    {
      section: "Signal quality",
      title: "Composite score",
      value: Number(data.phase.features.signal_quality_score_composite ?? 0).toFixed(2),
      detail: "Deception-adjusted weight across operationally necessary signals.",
    },
  ];

  const triggerRows = [
    {
      title: "P3 composite",
      value: String(data.phase.features.p3_trigger ?? 0),
      detail: "Multiple force-package classes above threshold together.",
    },
    {
      title: "P4 composite",
      value: String(data.phase.features.p4_trigger ?? 0),
      detail: "Phase 3 conditions paired with late execute or deception markers.",
    },
    {
      title: "Trump two-weeks anti-tell",
      value: String(data.phase.features.trump_two_weeks_pattern ?? 0),
      detail: "Delay-language anti-tell monitored against hard logistics.",
    },
    {
      title: "Posterior regime vector",
      value: JSON.stringify(data.phase.posterior),
      detail: "Live posterior over the six operational phases.",
      mono: true,
    },
  ];

  const hmmParameterRows = [
    {
      parameter: "Model family",
      value: data.model.hmm.type ?? "n/a",
      interpretation: "Gaussian latent phase model",
      meaning: "Turns noisy public signals into regime probabilities.",
    },
    {
      parameter: "Components",
      value: String(data.model.hmm.n_components),
      interpretation: "Six-state phase ladder",
      meaning: "Maps baseline through kinetic states.",
    },
    {
      parameter: "Covariance",
      value: data.model.hmm.covariance_type ?? "n/a",
      interpretation: "Diagonal variance structure",
      meaning: "Keeps the small-sample model conservative.",
    },
    {
      parameter: "Start probabilities",
      value: JSON.stringify(data.model.hmm.startprob),
      interpretation: "Initial state prior",
      meaning: "Shows where the model expects history to begin.",
      mono: true,
    },
    {
      parameter: "Transition row 0",
      value: JSON.stringify(data.model.hmm.transmat_first_row),
      interpretation: "First-state transition prior",
      meaning: "Shows how aggressively the model leaves baseline states.",
      mono: true,
    },
  ];

  const survivalRows = [
    {
      parameter: "Survival engine",
      value: data.model.survival?.type ?? "n/a",
      interpretation: "Time-to-kinetic head",
      meaning: "Translates phase state into event-horizon probabilities.",
    },
    {
      parameter: "Covariates",
      value: JSON.stringify(data.model.survival?.params_index ?? []),
      interpretation: "Live parameter index",
      meaning: "Signals currently feeding the Weibull horizon estimate.",
      mono: true,
    },
    {
      parameter: "Summary fields",
      value: JSON.stringify(data.model.survival?.summary_columns ?? []),
      interpretation: "Available coefficient diagnostics",
      meaning: "Useful for evaluating fit confidence and sign direction.",
      mono: true,
    },
  ];

  return (
    <div className="space-y-5">
      <Panel title="SignalOS Model2" subtitle="Phase engine, strategic signal stack, and survival configuration for the active workspace.">
        {fallbackMode ? (
          <div className="mb-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Standalone SignalOS is offline, so this tab is using a workspace-derived Model2 fallback from the current signals, timeline, and market state.
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-5">
          <MetricCard label="Current phase" value={`P${data.phase.phase}`} />
          <MetricCard label="HMM type" value={data.model.hmm.type ?? "n/a"} />
          <MetricCard label="Components" value={String(data.model.hmm.n_components)} />
          <MetricCard label="Covariance" value={data.model.hmm.covariance_type ?? "n/a"} />
          <MetricCard label="Iterations" value={String(data.model.hmm.n_iter)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text)]">State initialization</div>
            <div className="mt-3 space-y-3 text-sm text-[var(--color-text-muted)]">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em]">Start probabilities</div>
                <div className="mt-2 font-mono text-xs break-words">{JSON.stringify(data.model.hmm.startprob)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em]">First transition row</div>
                <div className="mt-2 font-mono text-xs break-words">{JSON.stringify(data.model.hmm.transmat_first_row)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Desk snapshot</div>
            <div className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <div>Means: <span className="font-mono">{JSON.stringify(data.model.hmm.means_shape)}</span></div>
              <div>Covars: <span className="font-mono">{JSON.stringify(data.model.hmm.covars_shape)}</span></div>
              <div>Survival type: <span className="font-mono">{data.model.survival?.type ?? "n/a"}</span></div>
              <div>Feature count: <span className="font-mono">{data.model.hmm.feature_columns.length}</span></div>
              <div>Last refresh: <span className="font-mono">{data.phase.last_update}</span></div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Strike Horizons" subtitle="Time-to-event probabilities from the active survival head.">
          <div className="grid gap-3 md:grid-cols-2">
            <MetricCard label="Within 24h" value={formatPct(data.phase.time_to_kinetic.within_24h)} />
            <MetricCard label="Within 72h" value={formatPct(data.phase.time_to_kinetic.within_72h)} />
            <MetricCard label="Within 7d" value={formatPct(data.phase.time_to_kinetic.within_7d)} />
            <MetricCard label="Within 30d" value={formatPct(data.phase.time_to_kinetic.within_30d)} />
          </div>
        </Panel>

        <Panel title="Closest Analogs" subtitle="Nearest historical playbooks from the active state vector.">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Operation</th>
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Distance</th>
                  <th className="border-b border-[var(--color-border)] px-0 py-3">Read</th>
                </tr>
              </thead>
              <tbody>
                {data.phase.top_analogs.map((analog: { operation_id: string; label?: string; distance: number }) => (
                  <tr key={analog.operation_id}>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">
                      {analog.label ?? analog.operation_id}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-mono text-[var(--color-text-muted)]">
                      {analog.distance.toFixed(3)}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 text-sm text-[var(--color-text-muted)]">
                      {analog.distance < 1 ? "Strong analog pressure" : analog.distance < 3 ? "Moderate analog pressure" : "Loose template fit"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Change Monitor" subtitle="Latest changes in the tracked military and strategic signal stack.">
        {data.phase.change_monitor?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Signal</th>
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Previous</th>
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Current</th>
                  <th className="border-b border-[var(--color-border)] px-0 py-3">Delta</th>
                </tr>
              </thead>
              <tbody>
                {data.phase.change_monitor.map(
                  (item: { name: string; previous: number; current: number; delta: number }) => (
                    <tr key={item.name}>
                      <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">
                        {item.name}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-mono text-[var(--color-text-muted)]">
                        {formatValue(item.previous)}
                      </td>
                      <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-mono text-[var(--color-text-muted)]">
                        {formatValue(item.current)}
                      </td>
                      <td className={`border-b border-[var(--color-border)] px-0 py-4 text-sm font-mono ${item.delta > 0 ? "text-emerald-300" : "text-[var(--color-text-muted)]"}`}>
                        {item.delta > 0 ? "+" : ""}
                        {formatValue(item.delta)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            No material change in the latest tracked feature window.
          </div>
        )}
      </Panel>

      <Panel title="Signal Pulse" subtitle="Recent seven-window movement across the core monitored features.">
        <div className="grid gap-3 lg:grid-cols-2">
          {data.phase.signal_pulses?.map((pulse: { name: string; values: number[]; current: number }) => (
            <div key={pulse.name} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-semibold text-[var(--color-text)]">{pulse.name}</div>
                <div className="font-mono text-xs text-[var(--color-text-muted)]">{formatValue(pulse.current)}</div>
              </div>
              <div className="mt-3 flex h-14 items-end gap-1">
                {pulse.values.map((value, index) => {
                  const max = Math.max(...pulse.values, 1);
                  const height = Math.max(8, (value / max) * 56);
                  return (
                    <div
                      key={`${pulse.name}-${index}`}
                      className="flex-1 rounded-[4px] bg-[var(--color-accent-soft)]"
                      style={{ height }}
                      title={`${pulse.name}: ${formatValue(value)}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Phase Memo" subtitle="Analyst-style readout of what the active stack is saying right now.">
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Current operating picture</div>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
              Current regime is <span className="font-semibold text-[var(--color-text)]">Phase {data.phase.phase}</span>. The active stack is
              reading <span className="font-semibold text-[var(--color-text)]">low immediate strike pressure</span>: tanker intensity is
              {` ${Number(data.phase.features.tanker_sortie_z ?? 0).toFixed(2)}`}, carrier posture is
              {` ${String(data.phase.features.csg_centcom_count ?? 0)}`}, embassy drawdown is
              {` ${String(data.phase.features.ordered_departure_iraq ?? 0)}`}, and both composite execute triggers remain
              {` P3=${String(data.phase.features.p3_trigger ?? 0)}`}/{`P4=${String(data.phase.features.p4_trigger ?? 0)}`}. This reads like
              a model in monitoring mode rather than late-phase force generation.
            </p>
          </div>
        </Panel>

        <Panel title="Force Package" subtitle="The military and strategic parameters currently pushing the phase score.">
          <div className="space-y-3">
            {signalRows.map((row) => (
              <SignalLine key={row.title} title={row.title} value={row.value} detail={`${row.section} · ${row.detail}`} />
            ))}
          </div>
        </Panel>

        <Panel title="Execution Triggers" subtitle="Phase-acceleration checks used to separate background noise from strike preparation.">
          <div className="space-y-3">
            {triggerRows.map((row) => (
              <SignalLine key={row.title} title={row.title} value={row.value} detail={row.detail} mono={row.mono} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Regime Engine" subtitle="The HMM-side settings and interpretations behind the latent phase score.">
          <ParameterTable rows={hmmParameterRows} />
        </Panel>

        <Panel title="Time-to-Event Model" subtitle="The survival head and the live covariates that shape horizon estimates.">
          <ParameterTable rows={survivalRows} />
        </Panel>
      </div>

      <Panel title="Feature Universe" subtitle="The exact feature columns currently routed into the Model2 artifact.">
        <div className="flex flex-wrap gap-2">
          {data.model.hmm.feature_columns.map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]"
            >
              {feature}
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Artifact Paths" subtitle="Current model files loaded by the live backend.">
        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 font-mono text-xs break-all">
            HMM: {data.model.hmm.artifact_path}
          </div>
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4 font-mono text-xs break-all">
            Survival: {data.model.survival?.artifact_path ?? "n/a"}
          </div>
        </div>
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

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function SignalLine({
  title,
  value,
  detail,
  mono = false,
}: {
  title: string;
  value: string;
  detail: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{detail}</div>
        </div>
        <div className={`max-w-[45%] break-words text-right text-sm font-semibold text-[var(--color-text)] ${mono ? "font-mono text-xs" : ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ParameterTable({
  rows,
}: {
  rows: Array<{
    parameter: string;
    value: string;
    interpretation: string;
    meaning: string;
    mono?: boolean;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Parameter</th>
            <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Live value</th>
            <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Interpretation</th>
            <th className="border-b border-[var(--color-border)] px-0 py-3">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.parameter}>
              <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">
                {row.parameter}
              </td>
              <td className={`border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)] ${row.mono ? "font-mono text-xs" : ""}`}>
                {row.value}
              </td>
              <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                {row.interpretation}
              </td>
              <td className="border-b border-[var(--color-border)] px-0 py-4 text-sm text-[var(--color-text-muted)]">
                {row.meaning}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
