"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { HypothesisNode } from "@/modules/thesis";

export function HypothesisCard({ hypothesis }: { hypothesis: HypothesisNode }) {
  return (
    <Panel title={hypothesis.label} subtitle={hypothesis.description}>
      <div className="grid gap-2 text-sm text-[var(--color-text-muted)]">
        <div>Prior: {(hypothesis.prior * 100).toFixed(1)}%</div>
        <div>Current: {(hypothesis.current_probability * 100).toFixed(1)}%</div>
        <div>Confidence: {(hypothesis.confidence * 100).toFixed(1)}%</div>
        <div>Status: {hypothesis.status}</div>
      </div>
    </Panel>
  );
}
