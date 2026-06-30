"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FamilySelector } from "@/components/family-selector";
import { DashboardTab } from "./dashboard-tab";
import { HowToTab } from "./how-to-tab";
import { ModelTab } from "./model-tab";
import { NewsTab } from "./news-tab";
import { PlaybookTab } from "./playbook-tab";
import { ReplayTab } from "./replay-tab";
import { SignalsTab } from "./signals-tab";
import { registeredFamilies } from "@/engine/families";
import { useSelectedFamily } from "@/hooks/use-selected-family";
import { useFamilyEngineOutput } from "@/hooks/use-family-engine-output";
import { useFixtureMode } from "@/components/providers";

const tabs = [
  { id: "howto", label: "Guide" },
  { id: "dashboard", label: "Overview" },
  { id: "model", label: "Prediction" },
  { id: "signals", label: "Evidence" },
  { id: "news", label: "News" },
  { id: "playbook", label: "Playbook" },
  { id: "replay", label: "Proof" },
] as const;

export function DashboardWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { fixtureMode } = useFixtureMode();
  const { family, setFamily } = useSelectedFamily();
  const activeTab = tabs.some((tab) => tab.id === searchParams.get("tab")) ? (searchParams.get("tab") as typeof tabs[number]["id"]) : "howto";
  const { dashboardData, familyOutput, model2Data, summaries, isLoading, error, signalWeights, setSignalWeight, refresh } = useFamilyEngineOutput(family, {
    includeReplay: activeTab === "replay",
    replayInterval: "daily",
  });
  const familyParam = searchParams.get("family");
  const invalidFamily = familyParam && !registeredFamilies.some((entry) => entry.id === familyParam);

  const setTab = React.useCallback(
    (tabId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tabId);
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">SignalOS</div>
            <div className="mt-2 text-3xl font-semibold text-[var(--color-text)]">News in. Decision out.</div>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
              SignalOS reads news, checks what matters, and shows how the prediction changed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FamilySelector families={registeredFamilies} activeFamily={family} summaries={summaries} onSelect={setFamily} />
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              aria-label="Refresh live workspace data"
              className="rounded-[8px] border border-[var(--color-border)] px-4 py-3 text-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto border-t border-[var(--color-border)] pt-4 sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`shrink-0 rounded-[8px] px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {invalidFamily ? (
          <div className="mt-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Bet not found, showing {family.displayName} instead.
          </div>
        ) : null}
        {fixtureMode ? (
          <div className="mt-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Stable demo data is active here, so the walkthrough stays repeatable.
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-[8px] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger-text)]">
            {error}
          </div>
        ) : null}
      </header>

      <main className="mt-5 flex-1">
        {isLoading || !familyOutput ? (
          <div aria-busy="true" className="space-y-4">
            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              Loading {tabs.find((tab) => tab.id === activeTab)?.label ?? "workspace"}...
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
              ))}
            </div>
          </div>
        ) : activeTab === "howto" ? (
          <HowToTab family={family} output={familyOutput} />
        ) : activeTab === "dashboard" ? (
          <DashboardTab family={family} output={familyOutput} model2Data={model2Data} />
        ) : activeTab === "model" && dashboardData ? (
          <ModelTab family={family} output={familyOutput} dashboardData={dashboardData} />
        ) : activeTab === "signals" ? (
          <SignalsTab family={family} output={familyOutput} signalWeights={signalWeights} setSignalWeight={setSignalWeight} />
        ) : activeTab === "news" ? (
          <NewsTab family={family} output={familyOutput} />
        ) : activeTab === "playbook" ? (
          <PlaybookTab family={family} output={familyOutput} />
        ) : (
          <ReplayTab family={family} output={familyOutput} />
        )}
      </main>
    </div>
  );
}
