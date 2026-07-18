"use client";

import React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import clsx from "clsx";
import type { FamilySummary, MarketFamily } from "@/modules/markets";

function signedGap(gap: number) {
  const points = Math.round(gap * 100);
  return `${points > 0 ? "+" : ""}${points}pts`;
}

export function FamilySelector({
  families,
  activeFamily,
  summaries,
  onSelect,
}: {
  families: MarketFamily[];
  activeFamily: MarketFamily;
  summaries: FamilySummary[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const visibleFamilies = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return families;
    return families.filter((family) =>
      `${family.displayName} ${family.shortThesis}`.toLowerCase().includes(normalized),
    );
  }, [families, query]);

  React.useEffect(() => {
    const nextIndex = Math.max(
      0,
      visibleFamilies.findIndex((family) => family.id === activeFamily.id),
    );
    setActiveIndex(nextIndex);
  }, [activeFamily.id, visibleFamilies]);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(visibleFamilies.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter") {
        const family = visibleFamilies[activeIndex];
        if (!family) return;
        event.preventDefault();
        onSelect(family.id);
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, onSelect, open, visibleFamilies]);

  return (
    <div ref={panelRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-left sm:min-w-[260px]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Current Question</div>
          <div className="truncate text-sm font-semibold text-[var(--color-text)]">{activeFamily.displayName}</div>
        </div>
        <ChevronDown className={clsx("h-4 w-4 text-[var(--color-text-muted)] transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(calc(100vw-2rem),360px)] max-w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-3 shadow-2xl">
          {families.length > 5 ? (
            <label className="mb-3 flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
          ) : null}
          <div role="listbox" aria-label="Bet selector" className="grid gap-1">
            {visibleFamilies.map((family, index) => {
              const summary = summaries.find((item) => item.familyId === family.id);
              const isActive = family.id === activeFamily.id;
              const isFocused = index === activeIndex;
              const tone =
                (summary?.gap ?? 0) > 0
                  ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                  : (summary?.gap ?? 0) < 0
                    ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]";

              return (
                <button
                  key={family.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelect(family.id);
                    setOpen(false);
                  }}
                  className={clsx(
                    "flex items-start justify-between gap-3 rounded-[8px] px-3 py-3 text-left transition",
                    isActive || isFocused ? "bg-[var(--color-surface-muted)]" : "hover:bg-[var(--color-surface-muted)]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--color-text)]">{family.displayName}</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{family.shortThesis}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={clsx("rounded-full px-2 py-1 text-xs font-semibold", tone)}>
                      {signedGap(summary?.gap ?? 0)}
                    </div>
                    {isActive ? <Check className="h-4 w-4 text-[var(--color-accent)]" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
