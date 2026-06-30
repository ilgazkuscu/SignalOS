"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-panel border border-[var(--color-danger-border)] bg-[var(--color-panel)] p-6">
      <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-danger-text)]">Application Error</div>
      <h2 className="mt-2 text-2xl font-semibold">The workbench hit a rendering failure.</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-2xl border border-[var(--color-danger-border)] px-4 py-2 text-sm"
      >
        Retry
      </button>
    </div>
  );
}
