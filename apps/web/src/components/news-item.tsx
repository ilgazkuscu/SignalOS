import React from "react";
import { ExternalLink } from "lucide-react";
import type { FamilyNewsRow } from "@/modules/markets";
import { SourceBadge } from "@/components/source-badge";
import { formatDateTimeEt } from "@/lib/utils/time";

export function NewsItem({ item }: { item: FamilyNewsRow }) {
  const hasUrl = typeof item.url === "string" && item.url.trim().length > 0;

  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <SourceBadge source={item.source} className="normal-case tracking-normal" /> · {formatDateTimeEt(item.timestamp)}
        </div>
        <div className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
          {(item.relevanceScore * 100).toFixed(0)} relevance
        </div>
      </div>
      <div className="mt-2">
        {hasUrl ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-2 text-sm font-semibold text-[var(--color-text)] transition hover:text-[var(--color-accent)]"
          >
            <span>{item.headline}</span>
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          </a>
        ) : (
          <div className="text-sm font-semibold text-[var(--color-text)]">{item.headline}</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
        <span>{item.status === "processed" ? "Processed into signal" : "Pending extraction"}</span>
        {item.processedSignalId ? <span>Signal {item.processedSignalId}</span> : null}
        {hasUrl ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            {item.source} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs">
            {item.source} <ExternalLink className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </span>
        )}
      </div>
    </div>
  );
}
