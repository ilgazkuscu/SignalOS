import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  children,
  right,
  className = ""
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
