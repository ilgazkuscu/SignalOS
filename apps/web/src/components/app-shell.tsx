"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { MarketConvergenceCard } from "@/components/market-convergence-card";
import { ModeToggle } from "@/components/mode-toggle";
import { useFixtureMode } from "@/components/providers";

const nav = [
  { href: "/", label: "Workspace" },
  { href: "/signalos-v1", label: "Demo Brief" },
  { href: "/signals", label: "Evidence" },
  { href: "/timeline", label: "News Monitor" },
  { href: "/playbook", label: "Guide" },
  { href: "/journal", label: "Decision Log" },
  { href: "/scenario-lab", label: "What If" },
  { href: "/model", label: "Prediction" },
  { href: "/replay", label: "Proof" },
  { href: "/rules", label: "Rules" },
  { href: "/admin", label: "Controls" },
] satisfies Array<{ href: Route; label: string }>;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { fixtureMode } = useFixtureMode();
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/snapshots" || pathname === "/showcase" || pathname.startsWith("/dashboard")) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="rounded-panel border border-[var(--color-border)] bg-[var(--color-panel)] p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
              SignalOS
            </p>
            <h1 className="font-condensed text-3xl font-semibold tracking-tight">
              SignalOS Demo Desk
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              See what changed, why it matters, and what to do next.
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs text-[var(--color-text)]">
              {fixtureMode ? "Demo Mode" : "Live Mode"}
            </div>
            <ModeToggle />
          </div>
          <nav className="mt-6 grid gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-[var(--color-border)] px-3 py-3 text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-muted)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <MarketConvergenceCard />
        </aside>
        <main className="space-y-5">
          <header className="rounded-panel border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                  AI automation demo
                </div>
                <p className="mt-2 max-w-4xl text-sm text-[var(--color-text-muted)]">
                  SignalOS turns news into a clear decision, with proof.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm">
                {fixtureMode
                  ? "Demo mode uses stable sample data."
                  : "Live mode is reading current data."}
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
