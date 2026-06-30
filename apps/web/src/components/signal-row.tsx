import React from "react";
import type { FamilySignalRow } from "@/engine/family";
import { SourceBadge } from "@/components/source-badge";
import { friendlyCopy, friendlySignalLabel } from "@/lib/friendly-signal-copy";
import { sourceDomain } from "@/lib/intelligence/source-url";
import { formatDateTimeEt } from "@/lib/utils/time";

function signed(value: number) {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

export function SignalRow({ signal }: { signal: FamilySignalRow }) {
  const tone =
    signal.impactDirection === "positive"
      ? "text-[var(--color-positive-text)]"
      : signal.impactDirection === "negative"
        ? "text-[var(--color-danger-text)]"
        : "text-[var(--color-text-muted)]";
  const impactLabel =
    signal.impactDirection === "positive"
      ? `Raised ${signed(signal.adjustedImpact)}`
      : signal.impactDirection === "negative"
        ? `Lowered ${signed(signal.adjustedImpact).replace("-", "")}`
        : "No move";

  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{friendlySignalLabel(signal.signalType)}</div>
          <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{friendlySignalLabel(signal.title)}</div>
        </div>
        <div className={`text-sm font-semibold ${tone}`}>{impactLabel}</div>
      </div>
      <div className="mt-2 text-sm text-[var(--color-text-muted)]">
        <SourceBadge source={signal.source} />{" "}
        {signal.sourceUrl ? (
          <>
            ·{" "}
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--color-text)]"
            >
              {sourceDomain(signal.sourceUrl) || "source"}
            </a>{" "}
          </>
        ) : null}
        · {formatDateTimeEt(signal.timestamp)}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{friendlyCopy(signal.rationale)}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        <span>Strength {(signal.magnitude * 100).toFixed(0)}%</span>
        <span>Trust {(signal.confidence * 100).toFixed(0)}%</span>
        <span>Impact {signal.weight.toFixed(2)}x</span>
      </div>
    </div>
  );
}
