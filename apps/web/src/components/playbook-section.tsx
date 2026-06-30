import React from "react";

export function PlaybookSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
