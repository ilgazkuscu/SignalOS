"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/panel";
import { HelpTooltip } from "@/components/tooltip";
import type { CoverageSource, SourceEvent, TimelinePayload } from "@/lib/types/domain";
import { formatDateTimeEt, relativeTimeFrom } from "@/lib/utils/time";

function rankEvent(event: SourceEvent, nowMs: number) {
  const ageHours = Math.max(0, (nowMs - new Date(event.occurredAt).getTime()) / 3_600_000);
  const recency =
    ageHours <= 6 ? 0.34 :
    ageHours <= 24 ? 0.22 :
    ageHours <= 72 ? 0.1 :
    -0.04;
  const sourceBonus =
    event.sourceId === "nyt" || event.sourceId === "wsj" || event.sourceId === "bbc" || event.sourceId === "ft"
      ? 0.18
      : event.liveClassification?.category === "strategic_analysis"
        ? -0.08
        : 0;
  const categoryBonus =
    event.liveClassification?.category === "resolution_wording" ? 0.2 :
    event.liveClassification?.category === "proxy_escalation" ? 0.16 :
    event.liveClassification?.category === "diplomatic_channel" ? 0.12 :
    event.liveClassification?.category === "force_posture" ? 0.1 :
    event.liveClassification?.category === "ambient_news" ? -0.18 :
    0;

  return (event.liveClassification?.relevanceScore ?? event.confidence) * 0.45 + recency + sourceBonus + categoryBonus;
}

export function TimelineView({ timeline: initialTimeline }: { timeline: TimelinePayload }) {
  const [timeline, setTimeline] = React.useState(initialTimeline);
  const [lastSeenAt, setLastSeenAt] = React.useState<string | null>(null);
  const [watchlistText, setWatchlistText] = React.useState("Trump, Iran, Fed policy, US-China, defense, oil");

  React.useEffect(() => {
    setTimeline(initialTimeline);
  }, [initialTimeline]);

  React.useEffect(() => {
    setLastSeenAt(window.localStorage.getItem("iran-ops:last-seen-timeline"));
    const savedWatchlist = window.localStorage.getItem("iran-ops:watchlist");
    if (savedWatchlist) setWatchlistText(savedWatchlist);
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("iran-ops:watchlist", watchlistText);
  }, [watchlistText]);

  const refreshTimeline = React.useCallback(async () => {
      try {
        const response = await fetch("/api/timeline", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as TimelinePayload;
        setTimeline(next);
      } catch {
        // Keep the last good payload on screen.
      }
  }, []);

  React.useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_LIVE_TIMELINE_POLL_INTERVAL_MS ?? 30_000);
    void refreshTimeline();
    const timer = window.setInterval(() => {
      void refreshTimeline();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [refreshTimeline]);

  const nowMs = new Date(timeline.generatedAt).getTime();
  const sorted = [...timeline.events].sort((a, b) => rankEvent(b, nowMs) - rankEvent(a, nowMs) || b.occurredAt.localeCompare(a.occurredAt));
  const lastUpdatedAgo = relativeTimeFrom(timeline.generatedAt, nowMs);
  const newSinceLastCheck = React.useMemo(() => {
    if (!lastSeenAt) return sorted.slice(0, 5);
    const lastSeenTime = new Date(lastSeenAt).getTime();
    return sorted.filter((event) => new Date(event.occurredAt).getTime() > lastSeenTime).slice(0, 8);
  }, [lastSeenAt, sorted]);
  const watchlistTerms = React.useMemo(
    () =>
      watchlistText
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean),
    [watchlistText],
  );
  const watchlistMatches = React.useMemo(() => {
    if (!watchlistTerms.length) return [];
    return timeline.clusters
      .filter((cluster) => {
        const haystack = `${cluster.canonicalTitle} ${cluster.summary} ${cluster.category} ${cluster.sources.map((source) => source.headline).join(" ")}`.toLowerCase();
        return watchlistTerms.some((term) => haystack.includes(term));
      })
      .slice(0, 6);
  }, [timeline.clusters, watchlistTerms]);

  const markSeen = () => {
    window.localStorage.setItem("iran-ops:last-seen-timeline", timeline.generatedAt);
    setLastSeenAt(timeline.generatedAt);
  };

  return (
    <div className="space-y-5">
      <Panel
        title="About SignalOS"
        subtitle="A simple AI automation demo built to turn noisy news into clear decisions."
      >
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Why I built it</div>
            <p className="mt-3 text-base leading-7 text-[var(--color-text)]">
              I wanted to show how AI can do real work, not just chat. SignalOS reads messy news, finds what matters, and turns it into a clear next step.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              The goal is simple: save time, reduce noise, and help people make faster decisions with proof.
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Pitch</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text)]">
                SignalOS is an AI automation demo that reads news, spots what matters, updates a prediction, and explains why. It shows the full loop a startup needs: collect information, make sense of it, take action, and keep proof.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AboutCard title="Simple" body="No confusing app talk. Show the answer and the reason." />
            <AboutCard title="Useful" body="Every update should help someone decide what to do next." />
            <AboutCard title="Honest" body="If the news is weak, the app should say so." />
            <AboutCard title="Fast" body="Read, check, update, explain. Then move on." />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <StepCard step="1" title="Read" body="The app scans news." />
          <StepCard step="2" title="Check" body="It asks if the news matters." />
          <StepCard step="3" title="Update" body="The prediction moves only when needed." />
          <StepCard step="4" title="Explain" body="The user sees why it changed." />
        </div>
      </Panel>

      <Panel
        title="Executive Brief"
        subtitle="What changed, why it matters, and what to watch next."
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          Why It Matters
          <HelpTooltip label="Why It Matters">Why this could change the prediction or next action.</HelpTooltip>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-positive-text)]" />
            Live monitor · updated {lastUpdatedAgo}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1">
            {timeline.freshness.usingCachedData ? "cached" : "fresh fetch"} · age {Math.round(timeline.freshness.cacheAgeMs / 1000)}s
          </span>
          <span>{timeline.newsSummary.length} executive item{timeline.newsSummary.length === 1 ? "" : "s"}</span>
          <button
            type="button"
            onClick={markSeen}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            Mark briefing seen
          </button>
        </div>
        {timeline.healthSummary ? (
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <MiniStat label="Healthy sources" value={String(timeline.healthSummary.healthySources)} />
            <MiniStat label="Failing sources" value={String(timeline.healthSummary.unhealthySources)} />
            <MiniStat label="Due now" value={String(timeline.healthSummary.dueNowSources)} />
            <MiniStat
              label="Last update"
              value={
                timeline.healthSummary.lastModelRefreshAt
                  ? relativeTimeFrom(timeline.healthSummary.lastModelRefreshAt, nowMs)
                  : "n/a"
              }
            />
          </div>
        ) : null}
        <div className="mb-4 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">New Since Last Check</div>
              <div className="mt-1 text-lg font-semibold">
                {newSinceLastCheck.length ? `${newSinceLastCheck.length} fresh item${newSinceLastCheck.length === 1 ? "" : "s"}` : "No fresh important items"}
              </div>
            </div>
            <Chip>{lastSeenAt ? `last seen ${relativeTimeFrom(lastSeenAt, nowMs)}` : "first visit on this device"}</Chip>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {newSinceLastCheck.length ? (
              newSinceLastCheck.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{event.sourceId} · {relativeTimeFrom(event.occurredAt, nowMs)}</div>
                  <div className="mt-1 text-sm font-semibold">{event.title}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-text-muted)]">
                You are caught up. The next material source-backed item will appear here.
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {timeline.newsSummary.map((item) => (
            <div key={item.id} className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>{item.importance}</Chip>
                <Chip>{item.status}</Chip>
                <Chip>{item.implicationTag}</Chip>
                <Chip>{(item.confidenceScore * 100).toFixed(0)}% trust</Chip>
                <Chip>{item.sourceCount} source{item.sourceCount === 1 ? "" : "s"}</Chip>
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">{item.headlineSummary}</h2>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]"><span className="font-semibold text-[var(--color-text)]">Why it matters: </span>{item.whyItMatters}</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]"><span className="font-semibold text-[var(--color-text)]">Watch next: </span>{item.watchItem}</p>
              <CoverageLinks sources={item.sources} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/timeline/brief"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            Open brief
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </Panel>

    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
      <Panel
          title="Watchlist"
          subtitle="Choose the topics that matter for the decision."
        >
          <label className="block text-sm">
            <span className="mb-2 block font-semibold">Tracked topics</span>
            <input
              value={watchlistText}
              onChange={(event) => setWatchlistText(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3"
              placeholder="Trump, Iran, Fed, oil, defense"
            />
          </label>
          <div className="mt-4 grid gap-3">
            {watchlistMatches.length ? (
              watchlistMatches.map((cluster) => (
                <div key={cluster.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold">{cluster.canonicalTitle}</div>
                    <Chip>{cluster.signalStage}</Chip>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">{cluster.whatToWatch}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip>{cluster.category.replaceAll("_", " ")}</Chip>
                    <Chip>{(cluster.confidenceScore * 100).toFixed(0)}% trust</Chip>
                    <Chip>{cluster.sourceCount} source{cluster.sourceCount === 1 ? "" : "s"}</Chip>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                No current clusters match the watchlist. Add comma-separated terms such as `Trump`, `Iran`, `oil`, or `defense`.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Narrative Shifts"
          subtitle="See which stories are getting stronger."
        >
          <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
            Trust rises when more credible sources report the same thing.
          </div>
          <div className="space-y-3">
            {timeline.narrativeTrends.map((trend) => (
              <div key={trend.id} className="rounded-[28px] border border-[var(--color-border)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{trend.category.replaceAll("_", " ")}</div>
                    <div className="mt-1 text-lg font-semibold">{trend.title}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip>{trend.label}</Chip>
                    <Chip>{(trend.velocityScore * 100).toFixed(0)} velocity</Chip>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">{trend.interpretation}</p>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <MiniStat label="Clusters" value={String(trend.clusterCount)} />
                  <MiniStat label="Sources" value={String(trend.sourceCount)} />
                  <MiniStat label="Latest" value={relativeTimeFrom(trend.latestAt, nowMs)} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Source Health"
          subtitle="Shows whether the news feed is fresh."
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            Source Coverage
            <HelpTooltip label="Source Coverage">Direct evidence behind an update. Click sources to verify the original reporting before acting.</HelpTooltip>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
            Last updated: {formatDateTimeEt(timeline.generatedAt)}. Last fetch attempt: {timeline.freshness.lastFetchAttemptAt ? formatDateTimeEt(timeline.freshness.lastFetchAttemptAt) : "n/a"}. Last successful live refresh: {timeline.freshness.lastSuccessfulFetchAt ? formatDateTimeEt(timeline.freshness.lastSuccessfulFetchAt) : "n/a"}.
          </div>
          <div className="mt-4 grid gap-3">
            {timeline.sourceCoverage.map((source) => (
              <div key={source.key} className="rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{source.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      {source.category.replace("_", " ")}
                    </div>
                  </div>
                  <div className={statusClassName(source.status)}>{source.status}</div>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{source.note}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  <span>{source.category.replace("_", " ")}</span>
                  {source.relevantItems !== undefined ? <span>{source.relevantItems} relevant</span> : null}
                  {source.itemsConsidered !== undefined ? <span>{source.itemsConsidered} scanned</span> : null}
                  {source.cacheAgeMs !== undefined ? <span>cache age {Math.round(source.cacheAgeMs / 1000)}s</span> : null}
                  {source.refreshIntervalMs !== undefined ? <span>ttl {Math.round(source.refreshIntervalMs / 1000)}s</span> : null}
                </div>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent)] transition hover:opacity-80"
                  >
                    Open source feed <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                {source.latestAt ? (
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    Latest item: {formatDateTimeEt(source.latestAt)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Proof Behind The Brief"
          subtitle="Grouped reports with source links."
        >
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            Clustered coverage
            <HelpTooltip label="Clustered coverage">Similar reports are grouped so one diplomatic or source channel does not spam the screen.</HelpTooltip>
          </div>
          <div className="space-y-3">
            {timeline.clusters.slice(0, 10).map((cluster) => (
              <div key={cluster.id} className="rounded-[28px] border border-[var(--color-border)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{cluster.category.replaceAll("_", " ")}</div>
                    <div className="mt-1 font-semibold">{cluster.canonicalTitle}</div>
                  </div>
                  <Chip>{cluster.sourceCount} source{cluster.sourceCount === 1 ? "" : "s"}</Chip>
                </div>
                <p className="mt-3 text-sm text-[var(--color-text-muted)]">{cluster.whyItMatters}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip>{cluster.signalStage}</Chip>
                  <Chip>{(cluster.confidenceScore * 100).toFixed(0)}% trust</Chip>
                </div>
                <CoverageLinks sources={cluster.sources} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Catalysts To Watch"
          subtitle="Only the live items that could change the prediction."
        >
          <div className="space-y-3">
            {(timeline.catalystFeed ?? []).length ? (
              timeline.catalystFeed?.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[var(--color-border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                      {(item.relevanceScore * 100).toFixed(0)}% relevance
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip>{item.category.replaceAll("_", " ")}</Chip>
                    <Chip>{item.impactPath.replaceAll("_", " ")}</Chip>
                    <Chip>{item.sourceId}</Chip>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">{item.rationale}</p>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {formatDateTimeEt(item.occurredAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
                No live items currently clear the catalyst threshold.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Full Timeline" subtitle="All key items in order.">
        <div className="space-y-4">
          {sorted.map((event) => {
            const tone = getTimelineTone(event);
            const emphatic = event.title.toLowerCase().includes("explicit end");

            return (
              <div
                key={event.id}
                className={`relative rounded-2xl border-l-4 pl-5 pr-4 py-4 ${
                  emphatic ? "bg-[var(--color-accent-soft)]" : "bg-[var(--color-panel)]"
                }`}
                style={{ borderLeftColor: tone.border }}
              >
                <div className="absolute left-[-7px] top-5 h-3 w-3 rounded-full" style={{ backgroundColor: tone.border }} />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.2em]" style={{ color: tone.border }}>
                    {tone.label}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {event.sourceId}
                  </div>
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  {formatDateTimeEt(event.occurredAt)}
                </div>
                <div className={`mt-1 ${emphatic ? "text-xl" : "text-lg"} font-semibold`}>{event.title}</div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">{event.body}</p>
                {event.liveClassification ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip>{event.liveClassification.category.replaceAll("_", " ")}</Chip>
                    <Chip>{`relevance ${(event.liveClassification.relevanceScore * 100).toFixed(0)}%`}</Chip>
                    {event.liveClassification.impacts.map((impact) => (
                      <Chip key={`${event.id}-${impact}`}>{impact.replaceAll("_", " ")}</Chip>
                    ))}
                  </div>
                ) : null}
                {event.liveClassification?.rationale ? (
                  <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-muted)]">
                    {event.liveClassification.rationale}
                  </div>
                ) : null}
                {event.liveClassification?.excerpt ? (
                  <div className="mt-3 rounded-2xl border border-[var(--color-border)] p-3 text-sm text-[var(--color-text-muted)]">
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Article context</div>
                    <p>{event.liveClassification.excerpt}</p>
                    {event.liveClassification.keyQuote ? (
                      <blockquote className="mt-3 border-l-2 border-[var(--color-border)] pl-3 italic text-[var(--color-text)]">
                        {event.liveClassification.keyQuote}
                      </blockquote>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
    </div>
  );
}

function getTimelineTone(event: SourceEvent) {
  const combined = `${event.title} ${event.body} ${event.tags.join(" ")}`.toLowerCase();

  if (combined.includes("operations concluded") || combined.includes("pause") || combined.includes("explicit")) {
    return { border: "var(--color-chart-negative)", label: "Official wording" };
  }

  if (
    combined.includes("sortie") ||
    combined.includes("tanker") ||
    combined.includes("carrier") ||
    combined.includes("military") ||
    combined.includes("strike")
  ) {
    return { border: "var(--color-chart-market)", label: "Conflict update" };
  }

  if (combined.includes("muscat") || combined.includes("talks") || combined.includes("diplomatic") || combined.includes("ceasefire")) {
    return { border: "var(--color-chart-model)", label: "Diplomacy" };
  }

  if (combined.includes("think tank") || combined.includes("analysis") || combined.includes("strategy")) {
    return { border: "var(--color-accent)", label: "Analysis" };
  }

  return { border: "var(--color-chart-neutral)", label: "News" };
}

function statusClassName(status: TimelinePayload["sourceCoverage"][number]["status"]) {
  if (status === "live") {
    return "rounded-full border border-[var(--color-border)] bg-[var(--color-positive-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-positive-text)]";
  }

  if (status === "stale") {
    return "rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]";
  }

  if (status === "fallback") {
    return "rounded-full border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-warning-text)]";
  }

  return "rounded-full border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-danger-text)]";
}

function CoverageLinks({ sources }: { sources: CoverageSource[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sources.map((source) =>
        source.url ? (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
            title={source.headline}
          >
            {source.sourceName}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span key={source.id} className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
            {source.sourceName}: no link
          </span>
        ),
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
      {children}
    </span>
  );
}

function AboutCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent)]">
        {step}
      </div>
      <div className="mt-3 text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
