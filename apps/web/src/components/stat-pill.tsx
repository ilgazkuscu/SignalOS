import React from "react";

export function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const tones = {
    positive: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
    negative: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
    neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text)]",
  };

  return (
    <div className={`rounded-2xl border border-[var(--color-border)] px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.25em] opacity-70">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
