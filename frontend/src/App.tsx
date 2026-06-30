import { useEffect, useMemo, useState } from "react";
import { BacktestChart } from "./components/BacktestChart";
import { EdgeTable } from "./components/EdgeTable";
import { MarketBook } from "./components/MarketBook";
import { ModelParams } from "./components/ModelParams";
import { Panel } from "./components/Panel";
import { PhaseIndicator } from "./components/PhaseIndicator";
import { SignalTimeline } from "./components/SignalTimeline";
import { useSignalStore } from "./state/store";

export default function App() {
  const { currentPhase, markets, backtest, model, refresh } = useSignalStore();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.token_id === selectedToken) ?? markets[0] ?? null,
    [markets, selectedToken]
  );

  if (!currentPhase || !backtest) {
    return <div className="p-8 text-zinc-300">Loading SignalOS...</div>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-4 py-6 text-[var(--color-text)] sm:px-6 lg:px-8">
      <header className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-muted)]">SignalOS</div>
            <div className="mt-2 text-3xl font-semibold">“Where you actually hear the news.”</div>
            <div className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
              Iran phase detection, kinetic timing, and market dislocation mapped into the existing endgame workspace idiom.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void refresh()} className="rounded-[8px] border px-4 py-3 text-sm">
              Refresh
            </button>
            <div className="rounded-[8px] border px-4 py-3 text-sm text-[var(--color-text-muted)]">Iran Ops Endgame</div>
            <div className="rounded-[8px] border px-4 py-3 text-sm text-[var(--color-text-muted)]">Dashboard</div>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          {["Dashboard", "Model", "Signals", "Replay"].map((tab, index) => (
            <div
              key={tab}
              className={`rounded-[8px] px-4 py-2 text-sm font-medium ${
                index === 0
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border text-[var(--color-text-muted)]"
              }`}
            >
              {tab}
            </div>
          ))}
        </nav>
      </header>
      <section className="mt-5 flex-1">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <PhaseIndicator phase={currentPhase.phase} posterior={currentPhase.posterior} />
          <SignalTimeline features={currentPhase.features} />
        </div>
        <EdgeTable
          markets={markets}
          selectedToken={selectedMarket?.token_id ?? null}
          onSelect={(tokenId) => setSelectedToken(tokenId)}
        />
        <BacktestChart replay={backtest} />
          </div>
          <div className="space-y-6">
            <MarketBook market={selectedMarket} />
            <Panel title="State Summary" subtitle="Current system read on the live operating picture.">
              <div className="grid gap-3">
                <div className="rounded-[8px] border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Last Update</div>
                  <div className="mt-2 text-sm">{currentPhase.last_update}</div>
                </div>
                <div className="rounded-[8px] border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">P3 Trigger</div>
                  <div className="mt-2 text-xl font-semibold">{currentPhase.features.p3_trigger ? "Active" : "Inactive"}</div>
                </div>
                <div className="rounded-[8px] border p-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">P4 Trigger</div>
                  <div className="mt-2 text-xl font-semibold">{currentPhase.features.p4_trigger ? "Active" : "Inactive"}</div>
                </div>
              </div>
            </Panel>
            <ModelParams model={model} />
          </div>
        </div>
      </section>
    </main>
  );
}
