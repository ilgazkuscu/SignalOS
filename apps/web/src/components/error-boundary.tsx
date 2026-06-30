"use client";

import React from "react";

interface BoundaryProps {
  title: string;
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-panel border border-[var(--color-danger-border)] bg-[var(--color-panel)] p-5">
          <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-danger-text)]">Section Error</div>
          <h2 className="mt-2 text-lg font-semibold">{this.props.title}</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            This panel failed to render. Refresh the page or inspect the underlying data feed.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
