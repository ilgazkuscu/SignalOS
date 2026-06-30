import React from "react";
import clsx from "clsx";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <div className={clsx("animate-pulse rounded-xl bg-[var(--color-surface-muted)]", className)} aria-hidden="true" />;
}

export function PanelSkeleton({
  title = true,
  rows = 4,
}: {
  title?: boolean;
  rows?: number;
}) {
  return (
    <section className="rounded-panel border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
      {title ? (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </section>
  );
}
