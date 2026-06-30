"use client";

import React from "react";
import { Panel } from "@/components/panel";
import type { EvidenceItem } from "@/lib/geopolitical-thesis/types";

export function EvidenceLedgerTable({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <Panel title="Evidence Ledger" subtitle="Reported, inferred, and speculative items tracked explicitly.">
      {evidence.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No evidence loaded.</p>
      ) : (
        <div className="space-y-3">
          {evidence.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{item.headline}</span>
                <span className="text-xs uppercase text-[var(--color-text-muted)]">{item.factuality_level}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.summary}</p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {item.source} · confidence {(item.confidence * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
