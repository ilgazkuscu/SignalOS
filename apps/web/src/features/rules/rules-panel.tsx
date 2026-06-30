import React from "react";
import { Panel } from "@/components/panel";
import type { MarketDefinition } from "@/lib/types/domain";
import { formatDateEt } from "@/lib/utils/time";

export function RulesPanel({ markets }: { markets: MarketDefinition[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Rules" subtitle="What counts and what does not.">
        <div className="grid gap-4">
          {markets.map((market) => (
            <div key={market.id} className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{market.label}</h3>
                <span className="text-sm text-[var(--color-text-muted)]">{formatDateEt(market.deadlineAt)}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <div>Official statement needed: {String(market.resolutionCriteria.officialAnnouncementRequired)}</div>
                <div>Truth Social counts: {String(market.resolutionCriteria.truthSocialCounts)}</div>
                <div>Video counts: {String(market.resolutionCriteria.videoStatementCounts)}</div>
                <div>Unnamed sources count: {String(!market.resolutionCriteria.unnamedSourcesDisallowed)}</div>
                <div>Best source: {market.resolutionCriteria.officialSourcePriority}</div>
                <div>Clear wording needed: {String(market.resolutionCriteria.clearEndLanguageRequired)}</div>
              </dl>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                {plainCopy(market.resolutionCriteria.interpretationNotes)}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Why Rules Matter" subtitle="A headline is not enough. The words must count.">
        <div className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Evidence types</div>
            <div className="mt-2">Official words, military moves, diplomacy, source strength, and manual review.</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Freshness</div>
            <div className="mt-2">Newer news matters more. Old news fades.</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Wording gap</div>
            <div className="mt-2">If the news is strong but the wording is vague, the prediction moves less.</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function plainCopy(value: string) {
  return value.replace(/resolution friction/gi, "wording gap").replace(/friction/gi, "wording gap");
}
