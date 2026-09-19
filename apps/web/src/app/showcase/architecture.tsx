"use client";

import React from "react";
import { ArrowDown, ArrowRight, ArrowUpDown, Database, Layers3, Radio, RefreshCcw, Server, Workflow } from "lucide-react";

const modules = [
  { name: "Intelligence", detail: "Normalize sources · cluster events", number: "01" },
  { name: "Thesis", detail: "Organize evidence · score scenarios", number: "02" },
  { name: "Belief", detail: "Update probabilities · explain changes", number: "03" },
  { name: "Markets", detail: "Apply market rules · assemble replay", number: "04" },
];

const jobs = [
  { name: "Collect", detail: "Poll feeds · deduplicate updates", number: "01" },
  { name: "Interpret", detail: "Validate evidence · score signals", number: "02" },
  { name: "Forecast", detail: "Update only the affected events", number: "03" },
  { name: "Record", detail: "Save forecast, evidence and model version", number: "04" },
];

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DDFDFA]";

export function Architecture() {
  const [production, setProduction] = React.useState(false);

  return (
    <div className="space-y-4" data-testid="showcase-architecture">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-label="Architecture view" className="inline-flex w-fit border border-white/20 p-1">
          {[{ label: "Built today", selected: !production }, { label: "Production path", selected: production }].map((option, index) => (
            <button key={option.label} type="button" aria-pressed={option.selected} aria-controls="architecture-view" onClick={() => setProduction(index === 1)}
              className={`min-h-11 px-4 text-xs font-semibold uppercase tracking-[0.12em] transition ${focusRing} ${option.selected ? "bg-[#DDFDFA] text-black" : "text-[#C5CAC6] hover:bg-white/10"}`}>
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs leading-5 text-[#A7ACA8]">{production ? "Proposed deployment · September 2026 review" : "Source-verified design · selected live adapters + demo data"}</p>
      </div>

      <div id="architecture-view" role="region" aria-label={production ? "Proposed production architecture" : "Current implementation architecture"} className="border border-white/15 bg-[#050909]/85 p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-sm text-[#DDFDFA]">
          <Layers3 size={16} aria-hidden="true" />
          <span>{production ? "One modular application. One background worker. One shared database." : "Four domain modules inside one Next.js application."}</span>
        </div>

        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,0.8fr)_20px_minmax(0,1.65fr)_20px_minmax(0,0.9fr)]">
          <div className="border border-white/15 bg-white/[0.025] p-4">
            <Label icon={<Radio size={17} />} text="Inputs" />
            <h3 className="mt-4 text-xl font-semibold">Public evidence</h3>
            <p className="mt-2 text-sm leading-6 text-[#B4BBB6]"><span className="sm:hidden">News, RSS, official sources and market snapshots.</span><span className="hidden sm:inline">News &amp; RSS<br />Official sources<br />Market snapshots</span></p>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-[#A7ACA8]">{production ? "Scheduled polling or source events trigger bounded jobs." : "Adapters preserve source, timestamp and market context."}</p>
          </div>

          <Connector />

          <div className="border border-[#90E7DD]/40 bg-[#90E7DD]/[0.035] p-4">
            <Label icon={production ? <Workflow size={17} /> : <Layers3 size={17} />} text={production ? "Background processing" : "Intelligence core"} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(production ? jobs : modules).map((module) => (
                <div key={module.name} className="border-l border-[#90E7DD]/35 pl-3">
                  <div className="flex flex-wrap items-center gap-x-2"><span className="font-mono text-[10px] text-[#90E7DD]">{module.number}</span><h3 className="text-sm font-semibold sm:text-base">{module.name}</h3></div>
                  <p className="mt-1 text-xs leading-5 text-[#B4BBB6]">{module.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[#90E7DD]/15 pt-3 text-xs leading-5 text-[#A7ACA8]">{production ? "Reuse the domain modules. Retry failed jobs safely; recompute only what changed." : "Typed public interfaces keep model logic separate from pages and data access."}</p>
          </div>

          <Connector label={production ? "via DB" : undefined} />

          <div className="border border-white/15 bg-white/[0.025] p-4">
            <Label icon={<Server size={17} />} text="Delivery" />
            <h3 className="mt-4 text-xl font-semibold">API → workspace</h3>
            <p className="mt-2 text-sm leading-6 text-[#B4BBB6]"><span className="sm:hidden">Forecasts, explanations, replay and market comparison.</span><span className="hidden sm:inline">Forecasts &amp; explanations<br />Timeline &amp; replay<br />Market comparison</span></p>
            <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-[#A7ACA8]">{production ? "Next.js reads stored results. Ingestion and scoring stay off the page-request path." : "Service composition → Next.js route handlers → React views."}</p>
          </div>
        </div>

        <div className={`mt-4 flex flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${production ? "border-[#DCA54A]/40 bg-[#DCA54A]/[0.05]" : "border-white/15 bg-white/[0.025]"}`}>
          <div className="flex items-center gap-3">
            <Database size={20} className={`shrink-0 ${production ? "text-[#DCA54A]" : "text-[#A7ACA8]"}`} aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold">{production ? "Shared PostgreSQL record + durable job queue" : "Current data layer: fixtures + local news state"}</div>
              <p className="mt-1 text-xs leading-5 text-[#B4BBB6]">{production ? "Evidence → signals → versioned forecasts → resolved outcomes" : "Prisma schema exists; persistent repository reads still need implementation."}</p>
            </div>
          </div>
          {production && <span className="inline-flex shrink-0 items-center gap-2 text-xs text-[#DCA54A]"><ArrowUpDown size={14} aria-hidden="true" /> Worker writes · API reads</span>}
        </div>

        <div className="mt-4 flex items-start gap-3 text-xs leading-5 text-[#B4BBB6]">
          <RefreshCcw size={16} className="mt-0.5 shrink-0 text-[#90E7DD]" aria-hidden="true" />
          <p>{production
            ? <><span className="text-[#DDFDFA]">Measured feedback:</span> resolved outcomes → Brier score, calibration and market baseline → reviewed model revisions. The API serves forecasts before outcomes resolve.</>
            : <><span className="text-[#DDFDFA]">Research runtime:</span> Python / FastAPI adds ingestion, phase models and backtests separately. This showcase replay uses a curated sequence, not a live forecast feed.</>}
          </p>
        </div>
      </div>

      <p className="max-w-5xl text-sm leading-6 text-[#A7ACA8]">{production
        ? "Start with reliable storage, idempotent jobs and observable results. Add separate services only when measured load or isolation requirements justify them."
        : "The product advantage is the traceable path from evidence to belief. The production path makes that same path durable and independently measurable."}
      </p>
    </div>
  );
}

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#90E7DD]"><span aria-hidden="true">{icon}</span>{text}</div>;
}

function Connector({ label }: { label?: string }) {
  return <div aria-hidden="true" className="flex flex-col items-center justify-center gap-1 text-[#90E7DD]/70"><ArrowRight size={18} className="hidden lg:block" /><ArrowDown size={18} className="lg:hidden" />{label && <span className="whitespace-nowrap text-[9px]">{label}</span>}</div>;
}
