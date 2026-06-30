import React from "react";
import clsx from "clsx";

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-panel border border-[var(--color-border)] bg-[var(--color-panel)] p-5 backdrop-blur",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
