"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { MarketLink, TradeDecision } from "@/modules/thesis";

export function MarketMapPanel({
  links,
  decisions,
}: {
  links: MarketLink[];
  decisions: TradeDecision[];
}) {
  return (
    <Panel title="Market Map" subtitle="Scenario relevance and trade translation by market.">
      {links.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No market mappings available.</p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const decision = decisions.find((item) => item.market_id === link.market_id);
            return (
              <div key={link.market_id} className="rounded-lg border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{link.market_id}</span>
                  <span>{(link.relevance_score * 100).toFixed(1)}%</span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{link.rationale}</p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Decision: {decision ? `${decision.edge} / ${decision.position_size}` : "none"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
