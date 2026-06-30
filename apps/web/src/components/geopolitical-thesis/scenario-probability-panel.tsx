"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { Scenario } from "@/lib/geopolitical-thesis/types";

export function ScenarioProbabilityPanel({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <Panel title="Scenarios" subtitle="Normalized scenario probabilities and drivers.">
      <div className="space-y-3">
        {(scenarios.length ? scenarios : []).map((scenario) => (
          <div key={scenario.id} className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{scenario.label}</span>
              <span>{(scenario.probability * 100).toFixed(1)}%</span>
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{scenario.drivers[0] ?? "No drivers recorded."}</p>
          </div>
        ))}
        {scenarios.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No scenarios computed yet.</p> : null}
      </div>
    </Panel>
  );
}
