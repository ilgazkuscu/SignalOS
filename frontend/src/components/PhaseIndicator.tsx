import { Panel } from "./Panel";

type Props = {
  phase: number;
  posterior: number[];
};

export function PhaseIndicator({ phase, posterior }: Props) {
  const labels = ["Baseline", "Narrative", "Posturing", "Positioning", "Prep", "Kinetic"];
  return (
    <Panel
      title="Current Phase"
      subtitle="Latent operational phase estimate from the live signal stack."
      right={<div className="rounded-[8px] bg-[var(--color-accent-soft)] px-3 py-2 text-sm font-medium text-[var(--color-accent)]">P{phase}</div>}
    >
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
          <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Most Likely Phase</div>
          <div className="mt-3 text-6xl font-semibold text-[var(--color-text)]">{phase}</div>
          <div className="mt-2 text-sm text-[var(--color-text-muted)]">{labels[phase] ?? "Unknown"}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {posterior.map((value, index) => (
            <div key={index} className="rounded-[8px] border border-[var(--color-border)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>P{index}</span>
                <span>{(value * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-900/80">
                <div
                  className="h-2 rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${Math.max(4, value * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">{labels[index] ?? `Phase ${index}`}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
