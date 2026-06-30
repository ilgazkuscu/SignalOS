"use client";

import React from "react";
import { HypothesisCard } from "@/components/geopolitical-thesis/hypothesis-card";
import { ScenarioProbabilityPanel } from "@/components/geopolitical-thesis/scenario-probability-panel";
import { EvidenceLedgerTable } from "@/components/geopolitical-thesis/evidence-ledger-table";
import { MarketMapPanel } from "@/components/geopolitical-thesis/market-map-panel";
import { Panel } from "@/components/panel";
import type { MarketLink, ThesisState, TradeDecision } from "@/lib/geopolitical-thesis/types";

export function ThesisDashboard({
  state,
  marketLinks,
  tradeDecisions,
}: {
  state: ThesisState;
  marketLinks: MarketLink[];
  tradeDecisions: TradeDecision[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-5">
        <Panel title="Geopolitical Thesis Engine" subtitle="Structured evidence, hypotheses, and scenarios.">
          <div className="grid gap-3 md:grid-cols-2">
            <div>Hypothesis confidence: {(state.hypothesis_confidence * 100).toFixed(1)}%</div>
            <div>Contradiction penalty: {(state.contradiction_penalty * 100).toFixed(1)}%</div>
          </div>
        </Panel>
        <EvidenceLedgerTable evidence={state.evidence} />
        <div className="grid gap-4 md:grid-cols-2">
          {state.hypotheses.filter((item) => item.id !== "H_ROOT").map((hypothesis) => (
            <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <ScenarioProbabilityPanel scenarios={state.scenarios} />
        <MarketMapPanel links={marketLinks} decisions={tradeDecisions} />
      </div>
    </div>
  );
}
