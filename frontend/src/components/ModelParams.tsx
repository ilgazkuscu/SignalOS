import { Panel } from "./Panel";

export function ModelParams({ model }: { model: any | null }) {
  if (!model) {
    return (
      <Panel title="Model Params" subtitle="Live model configuration and artifact metadata.">
        <div className="text-sm text-[var(--color-text-muted)]">Loading model metadata...</div>
      </Panel>
    );
  }

  return (
    <Panel title="Model Params" subtitle="Current HMM and survival settings loaded by the backend.">
      <div className="space-y-4 text-sm">
        <div className="rounded-[8px] border p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">HMM</div>
          <div className="mt-2 grid gap-2">
            <div>Type: <span className="font-mono">{model.hmm.type}</span></div>
            <div>Components: <span className="font-mono">{model.hmm.n_components}</span></div>
            <div>Covariance: <span className="font-mono">{model.hmm.covariance_type}</span></div>
            <div>Iterations: <span className="font-mono">{model.hmm.n_iter}</span></div>
            <div className="break-all">Artifact: <span className="font-mono">{model.hmm.artifact_path}</span></div>
          </div>
        </div>
        <div className="rounded-[8px] border p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Start Probabilities</div>
          <div className="mt-2 font-mono text-xs">{JSON.stringify(model.hmm.startprob)}</div>
        </div>
        <div className="rounded-[8px] border p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">First Transition Row</div>
          <div className="mt-2 font-mono text-xs">{JSON.stringify(model.hmm.transmat_first_row)}</div>
        </div>
        <div className="rounded-[8px] border p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Training Features</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {model.hmm.feature_columns.map((feature: string) => (
              <span key={feature} className="rounded-[8px] border px-2 py-1 text-xs text-[var(--color-text-muted)]">
                {feature}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-[8px] border p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Survival</div>
          <div className="mt-2 grid gap-2">
            <div>Type: <span className="font-mono">{model.survival.type}</span></div>
            <div className="break-all">Artifact: <span className="font-mono">{model.survival.artifact_path}</span></div>
            <div className="font-mono text-xs break-words">{JSON.stringify(model.survival.params_index)}</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
