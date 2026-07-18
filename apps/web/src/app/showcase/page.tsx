"use client";

import React from "react";
import { ArrowDown, BarChart3, Braces, CircleDot, ExternalLink, Focus, Menu, Pause, Play, Radar, RotateCcw, Route, ScanLine, StepForward, X, Zap } from "lucide-react";
import { showcaseNews, type ShowcaseNewsItem } from "./data";

const chartWidth = 1180;
const chartHeight = 560;
const padding = { top: 54, right: 42, bottom: 78, left: 66 };
const slideCount = 7;
const betTitle = "Trump announces end of U.S. military operations against Iran by June 30";
const focusRingClass = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DDFDFA]";

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

export default function ShowcasePage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const reducedMotion = useReducedMotion();
  const slideRefs = React.useRef<Array<HTMLElement | null>>([]);
  const runTimerRef = React.useRef<number | null>(null);
  const hasAutoRunChart = React.useRef(false);
  const current = showcaseNews[currentStep] ?? showcaseNews[0];
  const changedCount = showcaseNews.filter((item) => item.status === "changed").length;

  const goToSlide = React.useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(slideCount - 1, index));
    slideRefs.current[nextIndex]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [reducedMotion]);

  React.useEffect(() => {
    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current);
      runTimerRef.current = null;
    }
    if (!running) return;
    if (currentStep >= showcaseNews.length - 1) {
      setRunning(false);
      return;
    }
    runTimerRef.current = window.setTimeout(() => {
      runTimerRef.current = null;
      setCurrentStep((step) => Math.min(showcaseNews.length - 1, step + 1));
    }, 1250);

    return () => {
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current);
        runTimerRef.current = null;
      }
    };
  }, [currentStep, running]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset.slideIndex ?? 0);
        setActiveSlide(index);
      },
      { root: null, threshold: [0.46, 0.66] },
    );

    slideRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select")) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        goToSlide(activeSlide + 1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        goToSlide(activeSlide - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToSlide(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToSlide(slideCount - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSlide, goToSlide]);

  React.useEffect(() => {
    if (activeSlide !== 1 || hasAutoRunChart.current || reducedMotion) return;
    hasAutoRunChart.current = true;
    setCurrentStep(0);
    setRunning(true);
  }, [activeSlide, reducedMotion]);

  const setSlideRef = (index: number) => (node: HTMLElement | null) => {
    slideRefs.current[index] = node;
  };

  return (
    <main className="showcase-deck min-h-screen min-h-dvh snap-y snap-mandatory overflow-x-hidden overscroll-y-contain bg-[#020304] font-sans text-[#F3F4F0] selection:bg-[#DDFDFA] selection:text-black">
      <style jsx global>{`
        html {
          scroll-snap-type: y mandatory;
          background: #020304;
          overscroll-behavior-y: contain;
        }

        @media (prefers-reduced-motion: no-preference) {
          html {
            scroll-behavior: smooth;
          }
        }

        body {
          background: #020304;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
      <Atmosphere activeSlide={activeSlide} reducedMotion={reducedMotion} />
      <NarrativeRail activeSlide={activeSlide} />
      <StickyBar item={current} step={currentStep} />
      <HoverNav />
      <Progress activeSlide={activeSlide} total={slideCount} onSelect={goToSlide} />

      <Slide ref={setSlideRef(0)} index={0} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="SignalOS" title="The Polymarket YES price moved. Nobody could explain why fast enough." kicker="SignalOS visual narrative">
        <div className="grid min-h-[50vh] gap-7 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
          <div className="space-y-6">
            <p className="max-w-3xl text-[clamp(1.8rem,3.55vw,3.45rem)] font-semibold leading-[0.95] tracking-normal">
              A decision window opens before the story becomes obvious.
            </p>
            <p className="max-w-2xl text-lg leading-8 text-[#A7ACA8] sm:text-xl">
              SignalOS turns scattered public updates into a replayable trail: what changed, when belief moved, and why the move was defensible.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => goToSlide(1)} className={`inline-flex min-h-12 items-center gap-2 border border-[#DDFDFA] bg-[#DDFDFA] px-5 text-sm font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white ${focusRingClass}`}>
                <Focus size={17} />
                Follow the Signal
              </button>
              <button type="button" onClick={() => goToSlide(2)} className={`inline-flex min-h-12 items-center gap-2 border border-white/18 bg-white/[0.04] px-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#F3F4F0] transition hover:border-white/50 hover:bg-white/[0.08] ${focusRingClass}`}>
                <ArrowDown size={17} />
                Reveal the System
              </button>
            </div>
          </div>
          <HeroSignal item={current} />
        </div>
      </Slide>

      <Slide ref={setSlideRef(1)} index={1} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="01 / tension" title="First, watch the belief move before we explain the machinery.">
        <div className="grid gap-5 xl:grid-cols-[1fr_340px] xl:items-stretch">
          <div className="deck-panel p-3 sm:p-5">
            <ProbabilityChart items={showcaseNews} currentStep={currentStep} />
          </div>
          <div className="grid gap-3">
            <Readout item={current} step={currentStep} />
            <ActiveEvidence item={current} />
            <Controls running={running} setRunning={setRunning} setCurrentStep={setCurrentStep} />
          </div>
        </div>
        <StoryBridge label="Question this slide leaves open" text="If the line jumps, what evidence earned the jump?" />
      </Slide>

      <Slide ref={setSlideRef(2)} index={2} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="02 / perspective shift" title="Zoom out: price is the shadow, not the object.">
        <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
          <MetricPanel label="Polymarket YES price" value={`${current.polymarketProb.toFixed(1)}%`} body="The prediction price compresses many hidden reasons into one number." muted icon={<BarChart3 size={28} />} />
          <CausalSplit item={current} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <BriefingBlock label="Tracked question" title={betTitle} body="The deck follows how public events, diplomatic cues, and post-conflict analysis changed the belief path." />
          <BriefingBlock label="Core claim" title="SignalOS sells the missing layer: causality you can inspect." body="A prediction-price chart tells you where consensus landed. This replay shows the source-backed sequence that got it there." accent />
        </div>
      </Slide>

      <Slide ref={setSlideRef(3)} index={3} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="03 / micro view" title="Now zoom into one update becoming a belief change.">
        <SignalAssembly item={current} />
        <div className="mt-5" />
        <ProofPath currentStep={currentStep} onSelect={setCurrentStep} />
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <MethodCard number="1" title="Ingest" body="Relevant headlines enter with source, time, and event context preserved." />
          <MethodCard number="2" title="Score" body="The system separates material events from read-only context, then updates the visible probability path." />
          <MethodCard number="3" title="Explain" body="Every movement remains tied to the headline and explanation that caused it." />
        </div>
      </Slide>

      <Slide ref={setSlideRef(4)} index={4} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="04 / proof" title={`${showcaseNews.length} reads become ${changedCount} material changes. The trail stays inspectable.`}>
        <div className="grid max-h-[68vh] gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
          {showcaseNews.map((item, index) => (
            <NewsRow key={item.id} item={item} index={index} currentStep={currentStep} onSelect={setCurrentStep} />
          ))}
        </div>
        <StoryBridge label="What this resolves" text="The audience is no longer asked to trust a model output. They can audit the path." />
      </Slide>

      <Slide ref={setSlideRef(5)} index={5} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="05 / credibility" title="The persuasive point: this is a briefing layer, not a black box.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MethodCard title="Source-weighted analysis" body="Updates are framed as evidence, not vibes. Each event has a visible reason." icon={<ScanLine size={22} />} />
          <MethodCard title="Signal evolution" body="The graph makes temporal change the main object of inspection." icon={<Route size={22} />} />
          <MethodCard title="Outside comparison" body="Market probability remains visible so model movement can be challenged." icon={<Radar size={22} />} />
          <MethodCard title="Replay controls" body="Run, step, and reset turn the model path into a presentable artifact." icon={<Play size={22} />} />
        </div>
        <div className="mt-5 deck-panel grid gap-4 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Outcome</div>
          <div className="text-2xl font-semibold leading-snug text-[#F3F4F0] sm:text-4xl">
            What the user learns is not simply that the probability changed. They learn which source made the change defensible.
          </div>
        </div>
      </Slide>

      <Slide ref={setSlideRef(6)} index={6} activeSlide={activeSlide} reducedMotion={reducedMotion} eyebrow="06 / recommendation" title="Recommendation: fund the product that explains the number.">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="final-panel p-7 text-black">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-black/60">Final recommendation</div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <FinalMetric label="SignalOS YES belief" value="92.6%" />
              <FinalMetric label="Polymarket YES" value="94.0%" />
            </div>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-black/70">
              Build this as the decision-intelligence layer between raw public signals and high-stakes action: graph, timeline, reason, and review surface in one continuous proof path.
            </p>
          </div>
          <div className="grid gap-3">
            <DeckLink href="/signalos-v1" label="Open Demo" />
            <DeckLink href="/timeline" label="Open Timeline" />
            <DeckLink href="/model" label="Open Model" />
            <DeckLink href="/replay" label="Replay Analysis" />
          </div>
        </div>
      </Slide>
    </main>
  );
}

const Slide = React.forwardRef<HTMLElement, { index: number; activeSlide: number; reducedMotion: boolean; eyebrow: string; title: string; kicker?: string; children: React.ReactNode }>(
  ({ index, activeSlide, reducedMotion, eyebrow, title, kicker, children }, ref) => {
    const distance = index - activeSlide;
    const clampedDistance = Math.max(-1, Math.min(1, distance));
    const titleId = `showcase-slide-${index + 1}-title`;
    const HeadingTag = index === 0 ? "h1" : "h2";

    return (
    <section
      ref={ref}
      data-slide-index={index}
      aria-labelledby={titleId}
      className="relative flex min-h-screen min-h-dvh snap-start flex-col justify-center px-5 pb-16 pt-20 sm:px-8 lg:px-12"
    >
      <div
        className="showcase-slide-content relative z-10 mx-auto w-full max-w-[1440px] transition duration-700 ease-out"
        style={reducedMotion ? undefined : {
          opacity: Math.abs(distance) > 1 ? 0.58 : 1,
          transform: `translate3d(${clampedDistance * -24}px, 0, 0) scale(${distance === 0 ? 1 : 0.985})`,
        }}
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#90E7DD]">{eyebrow}</div>
            <HeadingTag id={titleId} className="mt-3 max-w-6xl text-[clamp(2.05rem,4.05vw,4.8rem)] font-semibold leading-[0.96] tracking-normal text-[#F3F4F0]">{title}</HeadingTag>
          </div>
          <div className="text-sm uppercase tracking-[0.22em] text-[#A7ACA8]">{kicker ?? `${String(index + 1).padStart(2, "0")} / ${slideCount}`}</div>
        </div>
        {children}
      </div>
    </section>
    );
  },
);
Slide.displayName = "Slide";

function Atmosphere({ activeSlide, reducedMotion }: { activeSlide: number; reducedMotion: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 transition-transform duration-700 ease-out" style={reducedMotion ? undefined : { transform: `translate3d(${-activeSlide * 1.5}vw, ${activeSlide * 0.8}vh, 0) scale(${1 + activeSlide * 0.015})` }}>
        <div className="absolute inset-x-[-18vw] top-[-22vh] h-[66vh] rotate-[-8deg] bg-[linear-gradient(90deg,transparent,rgba(30,231,210,0.13),rgba(220,165,74,0.08),transparent)] blur-3xl" />
        <div className="absolute inset-x-[-20vw] bottom-[-18vh] h-[58vh] rotate-[10deg] bg-[linear-gradient(90deg,transparent,rgba(221,253,250,0.08),rgba(135,92,255,0.09),transparent)] blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.17]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,3,4,0.05),#020304_92%)]" />
    </div>
  );
}

function NarrativeRail({ activeSlide }: { activeSlide: number }) {
  const labels = ["Hook", "Move", "Cause", "Update", "Proof", "Trust", "Act"];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <div className="relative h-[64vh] w-28">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/12" />
        <div className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-[#DDFDFA] shadow-[0_0_18px_rgba(221,253,250,0.75)] transition-all duration-500" style={{ height: `${((activeSlide + 1) / slideCount) * 100}%` }} />
        {labels.map((label, index) => (
          <div key={label} className="absolute left-0 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] transition" style={{ top: `${(index / (labels.length - 1)) * 100}%`, transform: "translateY(-50%)", color: index <= activeSlide ? "#DDFDFA" : "rgba(243,244,240,0.36)" }}>
            <span>{label}</span>
            <span className={`h-2.5 w-2.5 rounded-full border ${index <= activeSlide ? "border-[#DDFDFA] bg-[#DDFDFA]" : "border-white/22 bg-[#020304]"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyBar({ item, step }: { item: ShowcaseNewsItem; step: number }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#020304]/72 px-5 py-3 backdrop-blur-xl sm:px-8 lg:px-12">
      <div key={item.id} className="mx-auto flex max-w-[1440px] animate-[slideIn_260ms_ease-out] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="truncate text-sm font-semibold text-[#F3F4F0]">
          Signal replay {step + 1} · {item.headline}
        </div>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em]">
          <StatusBadge status={item.status} />
          <Delta value={item.deltaPts} />
        </div>
      </div>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function HoverNav() {
  const [open, setOpen] = React.useState(false);
  const links = [
    { href: "/signalos-v1", label: "Demo" },
    { href: "/timeline", label: "Timeline" },
    { href: "/model", label: "Model" },
    { href: "/replay", label: "Replay" },
    { href: "/dashboard?family=iran-ops-endgame", label: "Dashboard" },
  ];

  return (
    <nav
      aria-label="Showcase navigation"
      className="group fixed left-0 top-1/2 z-[60] -translate-y-1/2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <div className="flex items-center">
        <button
          type="button"
          aria-label={open ? "Close showcase navigation" : "Open showcase navigation"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          onFocus={() => setOpen(true)}
          className={`grid h-24 w-8 place-items-center rounded-r-full border border-l-0 border-[#DDFDFA]/40 bg-[#020304]/78 text-[#DDFDFA] shadow-[0_0_20px_rgba(221,253,250,0.42)] backdrop-blur-xl transition hover:bg-[#DDFDFA] hover:text-black group-hover:bg-[#DDFDFA] group-hover:text-black group-focus-within:bg-[#DDFDFA] group-focus-within:text-black ${focusRingClass}`}
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
        <div className={`border border-l-0 border-white/14 bg-[#050707]/92 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 ${open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}`}>
          <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Open surface</div>
          <div className="grid gap-2">
            {links.map((link) => (
              <a key={link.href} href={link.href} tabIndex={open ? undefined : -1} className={`inline-flex min-w-40 items-center justify-between gap-4 border border-white/12 bg-white/[0.035] px-3 py-3 text-sm font-semibold text-[#F3F4F0] transition hover:border-[#DDFDFA] hover:bg-[#DDFDFA] hover:text-black focus:border-[#DDFDFA] focus:bg-[#DDFDFA] focus:text-black ${focusRingClass}`}>
                {link.label}
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Progress({ activeSlide, total, onSelect }: { activeSlide: number; total: number; onSelect: (index: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-5 left-5 right-5 z-40 mx-auto flex max-w-[1440px] items-center gap-4 sm:left-8 sm:right-8 lg:left-12 lg:right-12">
      <div className="text-xs uppercase tracking-[0.2em] text-[#A7ACA8]">{String(activeSlide + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
      <div className="h-px flex-1 bg-white/12">
        <div className="h-px bg-[#DDFDFA] shadow-[0_0_16px_rgba(221,253,250,0.75)] transition-all duration-500" style={{ width: `${((activeSlide + 1) / total) * 100}%` }} />
      </div>
      <div className="hidden gap-2 sm:flex">
        {Array.from({ length: total }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeSlide ? "step" : undefined}
            onClick={() => onSelect(index)}
            className={`pointer-events-auto h-3 w-3 rounded-full transition ${focusRingClass} ${index === activeSlide ? "bg-[#DDFDFA] shadow-[0_0_12px_rgba(221,253,250,0.8)]" : "bg-white/22 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}

function HeroSignal({ item }: { item: ShowcaseNewsItem }) {
  return (
    <div className="deck-panel relative min-h-[360px] overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_30%,rgba(221,253,250,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Live signal surface</div>
          <CircleDot className="text-[#DDFDFA]" size={20} />
        </div>
        <div className="my-10 grid place-items-center">
          <div className="relative h-60 w-60 sm:h-72 sm:w-72">
            <div className="absolute inset-0 rounded-full border border-[#DDFDFA]/20" />
            <div className="absolute inset-6 rounded-full border border-[#DDFDFA]/20" />
            <div className="absolute inset-14 rounded-full border border-[#DDFDFA]/25" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#DDFDFA]/18 blur-2xl" />
            {showcaseNews.map((news, index) => {
              const angle = (index / showcaseNews.length) * Math.PI * 2 - Math.PI / 2;
              const radius = 116;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const active = news.id === item.id;
              return (
                <span
                  key={news.id}
                  className={`absolute left-1/2 top-1/2 h-3 w-3 rounded-full transition ${active ? "bg-[#DDFDFA] shadow-[0_0_24px_rgba(221,253,250,0.95)]" : news.status === "changed" ? "bg-[#DCA54A]" : "bg-white/35"}`}
                  style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                />
              );
            })}
            <div className="absolute left-1/2 top-1/2 text-center" style={{ transform: "translate(-50%, -50%)" }}>
              <div className="text-6xl font-semibold leading-none text-[#F3F4F0]">{item.modelProb.toFixed(0)}%</div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A7ACA8]">current belief</div>
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#A7ACA8]">Active evidence</div>
          <div className="mt-2 text-2xl font-semibold leading-tight">{item.headline}</div>
        </div>
      </div>
    </div>
  );
}

function ProbabilityChart({ items, currentStep }: { items: ShowcaseNewsItem[]; currentStep: number }) {
  const modelPoints = getPolylinePoints(items, currentStep, "modelProb");
  const marketPoints = getPolylinePoints(items, currentStep, "polymarketProb");
  const active = items[currentStep];
  const activePoint = getPoint(currentStep, active.modelProb, items.length);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="SignalOS YES belief compared with Polymarket YES price" className="h-[38vh] min-h-[280px] w-full sm:h-[50vh] sm:min-h-[380px]">
      <defs>
        <linearGradient id="showcaseModelLine" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#DCA54A" />
          <stop offset="46%" stopColor="#DDFDFA" />
          <stop offset="100%" stopColor="#90E7DD" />
        </linearGradient>
        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={chartWidth} height={chartHeight} fill="#050707" rx="18" />
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = scaleY(tick);
        return (
          <g key={tick}>
            <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />
            <text x={18} y={y + 4} fill="#8D9691" fontSize="13">{tick}%</text>
          </g>
        );
      })}
      {items.map((item, index) => {
        const x = scaleX(index, items.length);
        return (
          <g key={item.id}>
            <line x1={x} x2={x} y1={padding.top} y2={chartHeight - padding.bottom} stroke="rgba(255,255,255,0.055)" />
            <text x={x} y={chartHeight - 28} fill={index <= currentStep ? "#F3F4F0" : "#616864"} fontSize="12" textAnchor="end" transform={`rotate(-28 ${x} ${chartHeight - 28})`}>
              {item.timeLabel}
            </text>
          </g>
        );
      })}
      <polyline points={marketPoints} fill="none" stroke="#8D9691" strokeWidth="4" strokeDasharray="13 13" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <polyline points={modelPoints} fill="none" stroke="url(#showcaseModelLine)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)" />
      {items.slice(0, currentStep + 1).map((item, index) => {
        const model = getPoint(index, item.modelProb, items.length);
        const market = getPoint(index, item.polymarketProb, items.length);
        const activeDot = index === currentStep;
        return (
          <g key={item.id}>
            <circle cx={market.x} cy={market.y} r="5" fill="#8D9691" opacity="0.8" />
            <circle cx={model.x} cy={model.y} r={activeDot ? 12 : 7} fill={activeDot ? "#DDFDFA" : "#F3F4F0"} stroke="#050707" strokeWidth="3" />
            {activeDot ? <circle cx={model.x} cy={model.y} r="22" fill="none" stroke="#DDFDFA" strokeOpacity="0.28" strokeWidth="2" /> : null}
          </g>
        );
      })}
      <line x1={activePoint.x} x2={activePoint.x} y1={padding.top} y2={chartHeight - padding.bottom} stroke="#DDFDFA" strokeOpacity="0.22" strokeWidth="2" />
      <text x={padding.left} y={30} fill="#DDFDFA" fontSize="13" fontWeight="700" letterSpacing="2">SIGNALOS BELIEF</text>
      <text x={padding.left + 184} y={30} fill="#8D9691" fontSize="13" fontWeight="700" letterSpacing="2">POLYMARKET</text>
      <text x={chartWidth - padding.right} y={30} fill="#F3F4F0" fontSize="28" fontWeight="700" textAnchor="end">{active.modelProb.toFixed(1)}%</text>
    </svg>
  );
}

function getPolylinePoints(items: ShowcaseNewsItem[], currentStep: number, key: "modelProb" | "polymarketProb") {
  return items
    .slice(0, currentStep + 1)
    .map((item, index) => {
      const point = getPoint(index, item[key], items.length);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function getPoint(index: number, value: number, total: number) {
  return {
    x: scaleX(index, total),
    y: scaleY(value),
  };
}

function scaleX(index: number, total: number) {
  const usable = chartWidth - padding.left - padding.right;
  return padding.left + (usable * index) / Math.max(total - 1, 1);
}

function scaleY(value: number) {
  const usable = chartHeight - padding.top - padding.bottom;
  return padding.top + usable * (1 - Math.max(0, Math.min(100, value)) / 100);
}

function Readout({ item, step }: { item: ShowcaseNewsItem; step: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm xl:grid-cols-1">
      <ReadoutCell label="SignalOS belief" value={`${item.modelProb.toFixed(1)}%`} />
      <ReadoutCell label="Polymarket" value={`${item.polymarketProb.toFixed(1)}%`} />
      <ReadoutCell label="Replay step" value={`${step + 1} / ${showcaseNews.length}`} />
    </div>
  );
}

function ReadoutCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="deck-panel px-3 py-2 sm:px-4 sm:py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#90E7DD]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[#F3F4F0] sm:text-2xl">{value}</div>
    </div>
  );
}

function ActiveEvidence({ item }: { item: ShowcaseNewsItem }) {
  return (
    <div className="deck-panel hidden p-5 md:block">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Active evidence</div>
      <div className="mt-3 text-xl font-semibold leading-snug">{item.headline}</div>
      <p className="mt-4 text-sm leading-6 text-[#A7ACA8]">{item.why}</p>
    </div>
  );
}

function StoryBridge({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <div className="deck-panel max-w-2xl px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">{label}</div>
        <div className="mt-2 text-xl font-semibold leading-snug text-[#F3F4F0]">{text}</div>
      </div>
    </div>
  );
}

function CausalSplit({ item }: { item: ShowcaseNewsItem }) {
  return (
    <div className="deck-panel relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(221,253,250,0.11),transparent_34%,rgba(220,165,74,0.08)_72%,transparent)]" />
      <div className="relative z-10 grid min-h-[360px] gap-5 lg:grid-cols-[1fr_0.72fr] lg:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Hidden causal layer</div>
          <div className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Reveal the reason underneath the number.
          </div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#A7ACA8]">
            The narrative moves from a macro price to the micro evidence that created it, then back out to a recommendation the audience can trust.
          </p>
        </div>
        <div className="relative min-h-[300px]">
          <div className="absolute left-0 right-0 top-8 border border-white/12 bg-white/[0.035] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[#A7ACA8]">Observed price</div>
            <div className="mt-2 text-5xl font-semibold text-[#F3F4F0]">{item.polymarketProb.toFixed(1)}%</div>
          </div>
          <div className="absolute left-8 right-8 top-36 h-px bg-[#DDFDFA]/60 shadow-[0_0_18px_rgba(221,253,250,0.65)]" />
          <div className="absolute bottom-0 left-10 right-0 final-panel p-4 text-black">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
              <Zap size={14} />
              Explained belief
            </div>
            <div className="mt-2 text-5xl font-semibold">{item.modelProb.toFixed(1)}%</div>
            <div className="mt-3 text-sm leading-5 text-black/70">{item.headline}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalAssembly({ item }: { item: ShowcaseNewsItem }) {
  const stages = [
    { label: "Raw update", value: item.headline, icon: <ScanLine size={18} /> },
    { label: "Materiality", value: item.status === "changed" ? "Belief-changing evidence" : "Context, no material move", icon: <Braces size={18} /> },
    { label: "Delta", value: `${item.deltaPts > 0 ? "+" : ""}${item.deltaPts.toFixed(1)} pts`, icon: <Zap size={18} /> },
    { label: "Output", value: `${item.modelProb.toFixed(1)}% YES`, icon: <CircleDot size={18} /> },
  ];

  return (
    <div className="deck-panel overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">One update through the machine</div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#A7ACA8]">Macro to micro to macro</div>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative min-h-36 border border-white/12 bg-white/[0.035] p-4">
            {index < stages.length - 1 ? <div className="absolute right-[-1rem] top-1/2 hidden h-px w-8 bg-[#DDFDFA]/70 lg:block" /> : null}
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#90E7DD]">{stage.label}</div>
              <span className="text-[#DDFDFA]">{stage.icon}</span>
            </div>
            <div className="mt-7 text-xl font-semibold leading-snug">{stage.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Controls({ running, setRunning, setCurrentStep }: { running: boolean; setRunning: React.Dispatch<React.SetStateAction<boolean>>; setCurrentStep: React.Dispatch<React.SetStateAction<number>> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <ControlButton testId="showcase-run" label={running ? "Pause" : "Run"} icon={running ? <Pause size={16} /> : <Play size={16} />} onClick={() => setRunning((value) => !value)} primary />
      <ControlButton
        testId="showcase-next"
        label="Next"
        icon={<StepForward size={16} />}
        onClick={() => {
          setRunning(false);
          setCurrentStep((step) => Math.min(showcaseNews.length - 1, step + 1));
        }}
      />
      <ControlButton
        testId="showcase-reset"
        label="Reset"
        icon={<RotateCcw size={16} />}
        onClick={() => {
          setRunning(false);
          setCurrentStep(0);
        }}
      />
    </div>
  );
}

function ControlButton({ label, icon, onClick, primary = false, testId }: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center gap-2 border px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${focusRingClass} ${
        primary ? "border-[#DDFDFA] bg-[#DDFDFA] text-black hover:bg-white" : "border-white/14 bg-white/[0.035] text-[#F3F4F0] hover:border-[#DDFDFA] hover:bg-white/[0.08]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BriefingBlock({ label, title, body, accent = false }: { label: string; title: string; body: string; accent?: boolean }) {
  return (
    <div className={`deck-panel p-6 ${accent ? "shadow-[0_0_42px_rgba(221,253,250,0.08)]" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">{label}</div>
      <div className="mt-4 max-w-5xl text-3xl font-semibold leading-tight sm:text-5xl">{title}</div>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-[#A7ACA8]">{body}</p>
    </div>
  );
}

function MetricPanel({ label, value, body, muted = false, icon }: { label: string; value: string; body: string; muted?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`p-7 ${muted ? "deck-panel" : "final-panel text-black"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className={`text-sm font-semibold uppercase tracking-[0.2em] ${muted ? "text-[#90E7DD]" : "text-black/60"}`}>{label}</div>
        {icon ? <div className={muted ? "text-[#DDFDFA]" : "text-black/60"}>{icon}</div> : null}
      </div>
      <div className="mt-8 text-7xl font-semibold leading-none sm:text-8xl">{value}</div>
      <p className={`mt-6 max-w-xl text-sm leading-6 ${muted ? "text-[#A7ACA8]" : "text-black/70"}`}>{body}</p>
    </div>
  );
}

function MethodCard({ number, title, body, icon }: { number?: string; title: string; body: string; icon?: React.ReactNode }) {
  return (
    <div className="deck-panel min-h-[220px] p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">{number ?? "Signal"}</div>
        <span className="grid h-8 w-8 place-items-center border border-[#DDFDFA]/35 text-[#DDFDFA] shadow-[0_0_14px_rgba(221,253,250,0.18)]">{icon ?? <span className="h-2 w-2 rounded-full bg-[#DDFDFA]" />}</span>
      </div>
      <div className="mt-10 text-2xl font-semibold">{title}</div>
      <p className="mt-4 text-sm leading-6 text-[#A7ACA8]">{body}</p>
    </div>
  );
}

function ProofPath({ currentStep, onSelect }: { currentStep: number; onSelect: (step: number) => void }) {
  return (
    <div className="deck-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#90E7DD]">Evidence-backed timeline</div>
        <div className="text-xs uppercase tracking-[0.18em] text-[#A7ACA8]">Click a node to inspect</div>
      </div>
      <div className="grid grid-cols-7 gap-2" aria-label="Evidence steps">
        {showcaseNews.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(index)}
            className={`group relative min-h-24 border p-3 text-left transition ${focusRingClass} ${
              index <= currentStep ? "border-[#DDFDFA]/70 bg-[#DDFDFA]/10 text-[#F3F4F0]" : "border-white/10 bg-white/[0.025] text-[#A7ACA8]"
            }`}
            aria-current={index === currentStep ? "step" : undefined}
            aria-label={`Jump to step ${index + 1}`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em]">{String(index + 1).padStart(2, "0")}</div>
            <div className="mt-5 h-1 w-full bg-white/10">
              <div className={`h-1 ${item.status === "changed" ? "bg-[#DCA54A]" : "bg-[#8D9691]"}`} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.12em] opacity-70">{item.timeLabel}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NewsRow({ item, index, currentStep, onSelect }: { item: ShowcaseNewsItem; index: number; currentStep: number; onSelect: (step: number) => void }) {
  const isActive = index === currentStep;
  const isRead = index <= currentStep;

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-current={isActive ? "step" : undefined}
      className={`p-4 text-left transition ${focusRingClass} ${
        isActive ? "final-panel text-black" : isRead ? "deck-panel text-[#F3F4F0]" : "border border-white/10 bg-white/[0.025] text-[#A7ACA8]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{item.date} · Step {index + 1}</div>
          <div className="mt-2 text-lg font-semibold leading-snug">{item.headline}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs uppercase tracking-[0.14em]">
          <StatusBadge status={item.status} active={isActive} />
          <Delta value={item.deltaPts} active={isActive} />
        </div>
      </div>
      <p className={`mt-3 text-sm leading-6 ${isActive ? "text-black/70" : "text-[#A7ACA8]"}`}>{item.why}</p>
    </button>
  );
}

function StatusBadge({ status, active = false }: { status: ShowcaseNewsItem["status"]; active?: boolean }) {
  return (
    <span className={`border px-2 py-1 ${active ? "border-black/25 text-black" : "border-white/14 text-[#A7ACA8]"}`}>
      {status === "changed" ? "Changed" : "Read"}
    </span>
  );
}

function Delta({ value, active = false }: { value: number; active?: boolean }) {
  const color = active ? "currentColor" : value > 0 ? "#7CF1A9" : value < 0 ? "#FF7C7C" : "#A7ACA8";
  return <span style={{ color }}>{value > 0 ? "+" : ""}{value.toFixed(1)} pts</span>;
}

function FinalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">{label}</div>
      <div className="mt-2 text-6xl font-semibold leading-none">{value}</div>
    </div>
  );
}

function DeckLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className={`deck-panel inline-flex min-h-20 items-center justify-between gap-4 p-5 text-xl font-semibold transition hover:border-[#DDFDFA] hover:bg-[#DDFDFA] hover:text-black ${focusRingClass}`}>
      {label}
      <ExternalLink size={18} />
    </a>
  );
}
