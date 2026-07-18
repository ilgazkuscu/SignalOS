"use client";

import React from "react";
import { Panel } from "@/components/panel";
import { SignalRow } from "@/components/signal-row";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";
import { friendlyCopy, friendlySignalLabel } from "@/lib/friendly-signal-copy";

export function SignalsTab({
  family,
  output,
  signalWeights,
  setSignalWeight,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
  signalWeights: Record<string, number>;
  setSignalWeight: (signalType: string, value: number) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <Panel title="Sensitivity Controls" subtitle="Change how strongly each kind of evidence affects the prediction.">
          <div className="space-y-4">
            {family.relevantSignalTypes.map((signalType) => {
              const value = signalWeights[signalType] ?? family.signalWeights[signalType] ?? 1;
              return (
                <label key={signalType} className="block">
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[var(--color-text)]">{friendlySignalLabel(signalType)}</span>
                    <span className="text-[var(--color-text-muted)]">{value.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={value}
                    onChange={(event) => setSignalWeight(signalType, Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              );
            })}
          </div>
        </Panel>

        <Panel title="Evidence Impact By Date" subtitle="Which dates each kind of evidence can move.">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Evidence</th>
                  {output.buckets.map((bucket) => (
                    <th key={bucket.id} className="border-b border-[var(--color-border)] px-0 py-3 pr-4">
                      {bucket.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {output.signalMatrix.map((row) => (
                  <tr key={row.signalType}>
                    <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">{friendlySignalLabel(row.signalType)}</td>
                    {output.buckets.map((bucket) => {
                      const impact = row.bucketImpacts.find((item) => item.bucketId === bucket.id);

                      return (
                        <td key={`${row.signalType}-${bucket.id}`} className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                          {impact?.value ?? 0}%
                      </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Evidence Read" subtitle="Recent items that affected the prediction.">
          {output.signals.length ? (
            <div className="space-y-3">
              {output.signals.slice(0, 8).map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <EmptyState text={output.emptyStates.signals ?? "No evidence is available for this view."} />
          )}
        </Panel>

        <Panel title="Evidence Timeline" subtitle="The same items in time order.">
          {output.signalTimeline.length ? (
            <div className="space-y-3">
              {output.signalTimeline.map((signal) => (
                <div key={`${signal.id}-timeline`} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{friendlySignalLabel(signal.signalType)}</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{friendlySignalLabel(signal.title)}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{friendlyCopy(signal.rationale)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={output.emptyStates.signals ?? "No timeline entries are available."} />
          )}
        </Panel>
      </div>
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
