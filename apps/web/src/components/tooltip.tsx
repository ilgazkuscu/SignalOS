import React from "react";
import { Info } from "lucide-react";

export function HelpTooltip({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-64 -translate-x-1/2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-xs leading-relaxed text-[var(--color-text)] shadow-xl group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}
