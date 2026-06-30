"use client";

import React from "react";
import { PlaybookSection } from "@/components/playbook-section";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, MarketFamily } from "@/engine/family";

export function PlaybookTab({
  family,
  output,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
}) {
  if (!output.playbook) {
    return <EmptyState text={output.emptyStates.playbook ?? "No playbook written yet for this family."} />;
  }

  const currentThresholdIndex = output.playbook.thresholds.findIndex((threshold) => {
    if (/model > 0\.55/i.test(threshold.condition)) return output.aggregateModelProbability > 0.55 && output.aggregateMarketProbability < 0.4;
    if (/abs\(model - market\) < 0\.05/i.test(threshold.condition)) return Math.abs(output.gap) < 0.05;
    if (/model < 0\.20/i.test(threshold.condition)) return output.aggregateModelProbability < 0.2 && output.aggregateMarketProbability > 0.35;
    if (/model > 0\.65/i.test(threshold.condition)) return output.aggregateModelProbability > 0.65 && output.aggregateMarketProbability < 0.5;
    if (/model between 0\.35 and 0\.55/i.test(threshold.condition))
      return output.aggregateModelProbability >= 0.35 && output.aggregateModelProbability <= 0.55 && Math.abs(output.gap) < 0.08;
    if (/model < 0\.25/i.test(threshold.condition)) return output.aggregateModelProbability < 0.25 && output.aggregateMarketProbability > 0.4;
    return false;
  });

  return (
    <div className="space-y-5">
      <Panel title={`${family.displayName} Playbook`} subtitle="Readable operating guide for the selected bet.">
        <p className="max-w-4xl text-sm leading-7 text-[var(--color-text-muted)]">{output.playbook.thesis}</p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <PlaybookSection title="Confirming" items={output.playbook.confirmingEvents} />
        <PlaybookSection title="Invalidating" items={output.playbook.invalidatingEvents} />
      </div>

      <Panel title="Thresholds" subtitle="Action levels keyed to current model and market state.">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Condition</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Action</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Rationale</th>
                <th className="border-b border-[var(--color-border)] px-0 py-3">State</th>
              </tr>
            </thead>
            <tbody>
              {output.playbook.thresholds.map((threshold, index) => {
                const active = index === currentThresholdIndex;
                return (
                  <tr key={threshold.condition} className={active ? "bg-[var(--color-surface-muted)]" : undefined}>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">{threshold.condition}</td>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">{threshold.action}</td>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">{threshold.rationale}</td>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 text-sm text-[var(--color-text-muted)]">{active ? "Active" : "Idle"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <PlaybookSection title="Hedges" items={output.playbook.hedges} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
      {text}
    </div>
  );
}
