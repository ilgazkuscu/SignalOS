"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Panel } from "@/components/panel";
import { HelpTooltip } from "@/components/tooltip";
import type { CandidateImpact, SignalsExplorerPayload, Signal, SignalDirection, SignalStatus, SourceEvent } from "@/lib/types/domain";
import { determineAffectedLatents } from "@/lib/engine/explanations";
import { sourceEventUrl } from "@/lib/intelligence/source-url";
import { formatDateTimeEt } from "@/lib/utils/time";

type SortKey = "newest" | "confidence" | "impact";

export function SignalExplorer({
  initialData,
}: {
  initialData: SignalsExplorerPayload;
}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    family: "all",
    subtype: "",
    status: "all",
    confidenceMin: 0,
    confidenceMax: 100,
    source: "all",
    direction: "all",
    extractionMethod: "all",
    search: "",
    timeWindowHours: "all",
    sortKey: "newest" as SortKey,
  });

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/signals", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Signal API returned ${response.status}`);
      }
      setData((await response.json()) as SignalsExplorerPayload);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Signal API request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const intervalMs = Number(process.env.NEXT_PUBLIC_LIVE_TIMELINE_POLL_INTERVAL_MS ?? 30_000);
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, []);

  const candidateImpactsBySignalId = useMemo(
    () => Object.fromEntries(data.candidateImpacts.map((impact) => [impact.signalId, impact])) as Record<string, CandidateImpact>,
    [data.candidateImpacts],
  );

  const familyOptions = useMemo(() => ["all", ...new Set(data.signals.map((signal) => signal.family))], [data.signals]);
  const sourceOptions = useMemo(() => ["all", ...new Set(data.signals.map((signal) => signal.sourceId))], [data.signals]);
  const methodOptions = useMemo(() => ["all", ...new Set(data.signals.map((signal) => signal.extractionMethod))], [data.signals]);

  const filteredSignals = useMemo(() => {
    const now = new Date(data.generatedAt);
    const filtered = data.signals.filter((signal) => {
      const signalDate = new Date(signal.occurredAt);
      const matchesFamily = filters.family === "all" || signal.family === filters.family;
      const matchesSubtype = signal.subtype.toLowerCase().includes(filters.subtype.toLowerCase());
      const matchesStatus = filters.status === "all" || signal.status === filters.status;
      const matchesConfidence =
        signal.confidence * 100 >= filters.confidenceMin && signal.confidence * 100 <= filters.confidenceMax;
      const matchesSource = filters.source === "all" || signal.sourceId === filters.source;
      const matchesDirection = filters.direction === "all" || signal.direction === filters.direction;
      const matchesMethod = filters.extractionMethod === "all" || signal.extractionMethod === filters.extractionMethod;
      const matchesSearch =
        filters.search.trim() === "" ||
        `${signal.id} ${signal.subtype} ${signal.rationale} ${signal.family}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchesWindow =
        filters.timeWindowHours === "all" ||
        now.getTime() - signalDate.getTime() <= Number(filters.timeWindowHours) * 60 * 60 * 1000;

      return (
        matchesFamily &&
        matchesSubtype &&
        matchesStatus &&
        matchesConfidence &&
        matchesSource &&
        matchesDirection &&
        matchesMethod &&
        matchesSearch &&
        matchesWindow
      );
    });

    return filtered.sort((left, right) => {
      if (filters.sortKey === "confidence") return right.confidence - left.confidence;
      if (filters.sortKey === "impact") {
        const leftImpact = Math.abs(candidateImpactsBySignalId[left.id]?.biggestAffectedBucketDelta ?? left.magnitude * left.confidence);
        const rightImpact = Math.abs(candidateImpactsBySignalId[right.id]?.biggestAffectedBucketDelta ?? right.magnitude * right.confidence);
        return rightImpact - leftImpact;
      }

      return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    });
  }, [candidateImpactsBySignalId, data.generatedAt, data.signals, filters]);

  const filteredEvents = useMemo(() => {
    const visibleIds = new Set(filteredSignals.map((signal) => signal.sourceEventId));
    return data.sourceEvents.filter((event) => visibleIds.has(event.id));
  }, [data.sourceEvents, filteredSignals]);
  const groupedSignals = useMemo(() => groupSignalsForDisplay(filteredSignals), [filteredSignals]);

  const counts = useMemo(
    () => ({
      all: data.signals.length,
      verified: data.signals.filter((signal) => signal.status === "verified").length,
      candidate: data.signals.filter((signal) => signal.status === "candidate").length,
      rejected: data.signals.filter((signal) => signal.status === "rejected").length,
    }),
    [data.signals],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Evidence Controls" subtitle="Find the news items behind the prediction.">
        <div className="sticky top-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip label={`All (${counts.all})`} active={filters.status === "all"} onClick={() => setFilters((current) => ({ ...current, status: "all" }))} />
            <ToggleChip label={`Verified (${counts.verified})`} active={filters.status === "verified"} onClick={() => setFilters((current) => ({ ...current, status: "verified" as SignalStatus }))} />
            <ToggleChip label={`Candidate (${counts.candidate})`} active={filters.status === "candidate"} onClick={() => setFilters((current) => ({ ...current, status: "candidate" as SignalStatus }))} />
            <ToggleChip label={`Rejected (${counts.rejected})`} active={filters.status === "rejected"} onClick={() => setFilters((current) => ({ ...current, status: "rejected" as SignalStatus }))} />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <FilterSelect label="Family" value={filters.family} options={familyOptions} onChange={(value) => setFilters((current) => ({ ...current, family: value }))} />
              <FilterSelect label="Source" value={filters.source} options={sourceOptions} onChange={(value) => setFilters((current) => ({ ...current, source: value }))} />
              <FilterSelect label="Direction" value={filters.direction} options={["all", "pro_yes", "pro_no", "neutral"]} onChange={(value) => setFilters((current) => ({ ...current, direction: value as SignalDirection | "all" }))} />
              <FilterSelect label="Extraction" value={filters.extractionMethod} options={methodOptions} onChange={(value) => setFilters((current) => ({ ...current, extractionMethod: value }))} />
              <FilterSelect label="Time Window" value={filters.timeWindowHours} options={["all", "24", "72", "168"]} onChange={(value) => setFilters((current) => ({ ...current, timeWindowHours: value }))} />
              <FilterSelect label="Sort" value={filters.sortKey} options={["newest", "confidence", "impact"]} onChange={(value) => setFilters((current) => ({ ...current, sortKey: value as SortKey }))} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-2 block">Subtype</span>
                <input
                  value={filters.subtype}
                  onChange={(event) => setFilters((current) => ({ ...current, subtype: event.target.value }))}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-2 block">Text Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] py-2 pl-9 pr-3"
                  />
                </div>
              </label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <RangeField label={`Trust Min (${filters.confidenceMin}%)`} value={filters.confidenceMin} onChange={(value) => setFilters((current) => ({ ...current, confidenceMin: value }))} />
              <RangeField label={`Trust Max (${filters.confidenceMax}%)`} value={filters.confidenceMax} onChange={(value) => setFilters((current) => ({ ...current, confidenceMax: value }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    family: "all",
                    subtype: "",
                    status: "all",
                    confidenceMin: 0,
                    confidenceMax: 100,
                    source: "all",
                    direction: "all",
                    extractionMethod: "all",
                    search: "",
                    timeWindowHours: "all",
                    sortKey: "newest",
                  })
                }
                className="rounded-2xl border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                Reset filters
              </button>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-text)]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Evidence feed degraded
              </div>
              <p className="mt-2">
                {error}. Showing the last saved data{data.fixtureMode ? " from demo mode" : ""}.
              </p>
            </div>
          ) : data.fixtureMode ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
              Demo mode is active. Refreshing still calls the API, but the endpoint resolves from stable seeded data for a repeatable walkthrough.
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
            Showing <span className="font-semibold text-[var(--color-text)]">{filteredSignals.length}</span> of {data.signals.length} evidence items and {filteredEvents.length} linked source items.
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Evaluated Evidence" subtitle="What SignalOS read and whether it changed the prediction.">
          <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold">
            <span className="inline-flex items-center gap-2">
              Evidence
              <HelpTooltip label="Evidence">A useful event or source-backed update.</HelpTooltip>
            </span>
            <span className="inline-flex items-center gap-2">
              Trust
              <HelpTooltip label="Trust">How strongly the current evidence supports the update.</HelpTooltip>
            </span>
            <span className="inline-flex items-center gap-2">
              Source Coverage
              <HelpTooltip label="Source Coverage">Clickable evidence behind the update. Use it to verify before treating it as useful.</HelpTooltip>
            </span>
          </div>
          {filteredSignals.length === 0 ? (
            <EmptyState text="No evidence matches the current filters." />
          ) : (
            <div className="space-y-3">
              {groupedSignals.map((group) => {
                const signal = group.signals[0];
                const impact = candidateImpactsBySignalId[signal.id];
                const affects = determineAffectedLatents(signal.family);
                const isExpanded = expandedSignalId === group.id;
                const groupEvents = data.sourceEvents.filter((event) =>
                  group.signals.some((groupSignal) => groupSignal.sourceEventId === event.id),
                );

                return (
                  <div key={group.id} className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{signal.family}</div>
                        <div className="mt-1 text-lg font-semibold">{signal.subtype}</div>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {group.signals.length > 1 ? `${group.signals.length} related items · ` : ""}
                          {formatDateTimeEt(signal.occurredAt)} · {group.sourceLabel}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-right text-sm">
                        <MetricPill label="Strength" value={signal.magnitude.toFixed(2)} />
                        <MetricPill label="Trust" value={`${(signal.confidence * 100).toFixed(0)}%`} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-text-muted)]">{plainCopy(signal.rationale)}</p>
                    <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">Source Coverage</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          {groupEvents.length} source{groupEvents.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {groupEvents.length ? (
                          groupEvents.map((event) => <SourceLink key={event.id} event={event} />)
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">No linked source event available.</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <InfoBadge label={`State: ${signal.status}`} tone={signal.status === "candidate" ? "warning" : signal.status === "rejected" ? "negative" : "positive"} />
                      <InfoBadge label={`Push: ${signal.direction}`} />
                      <InfoBadge label={`Fresh for: ${signal.decayHalfLifeHours}h`} />
                      <InfoBadge label={`Source type: ${signal.extractionMethod}`} />
                      <InfoBadge label={`Moves: ${affects.map(formatAffectedLabel).join(", ")}`} />
                      {group.signals.length > 1 ? <InfoBadge label={`Grouped: ${group.signals.length} items`} tone="positive" /> : null}
                      {signal.correlationKey ? <InfoBadge label="Linked item" tone="warning" /> : null}
                    </div>

                    {impact ? (
                      <div className="mt-4 rounded-2xl bg-[var(--color-surface-muted)] p-4">
                        <div className="text-sm font-semibold">Possible impact if confirmed</div>
                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{plainCopy(impact.explanation)}</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <MetricPill label="Real end delta" value={formatPoints(impact.deltaTrueDeescalationProbability)} />
                          <MetricPill label="Statement change" value={formatPoints(impact.deltaFormalAnnouncementProbability)} />
                          <MetricPill label="Wording change" value={formatDecimal(impact.deltaResolutionFrictionScore)} />
                          <MetricPill label="Biggest change" value={`${impact.biggestAffectedBucket} ${formatPoints(impact.biggestAffectedBucketDelta)}`} />
                        </div>
                        {impact.uncertaintyCaveat ? (
                          <p className="mt-3 text-xs text-[var(--color-warning-text)]">{plainCopy(impact.uncertaintyCaveat)}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setExpandedSignalId((current) => (current === group.id ? null : group.id))}
                      className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>

                    {isExpanded ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <DetailCard title="How it was scored">
                          <pre className="overflow-x-auto text-xs text-[var(--color-text-muted)]">{JSON.stringify(signal.derivedFeatures, null, 2)}</pre>
                        </DetailCard>
                        <DetailCard title="Original details">
                          <pre className="overflow-x-auto text-xs text-[var(--color-text-muted)]">{JSON.stringify(signal.rawPayload, null, 2)}</pre>
                        </DetailCard>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Source Material" subtitle="The original items behind the evidence.">
          {filteredEvents.length === 0 ? (
            <EmptyState text="No source items match the current evidence." />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const isExpanded = expandedEventId === event.id;

                return (
                  <div key={event.id} className="rounded-2xl border border-[var(--color-border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {event.sourceId} · {formatDateTimeEt(event.occurredAt)}
                        </div>
                      </div>
                      <InfoBadge label={`${(event.confidence * 100).toFixed(0)}% trust`} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">{plainCopy(event.body)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                      <span>Source type: {event.extractionMethod}</span>
                      <span>State: {event.status}</span>
                      <span>Tags: {event.tags.join(", ")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedEventId((current) => (current === event.id ? null : event.id))}
                      className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-accent)]"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isExpanded ? "Hide source details" : "Show source details"}
                    </button>
                    {isExpanded ? (
                      <div className="mt-4 rounded-2xl bg-[var(--color-surface-muted)] p-4">
                        <pre className="overflow-x-auto text-xs text-[var(--color-text-muted)]">{JSON.stringify(event.rawPayload, null, 2)}</pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
          : "border-[var(--color-border)] text-[var(--color-text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "confidence" ? "trust" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </label>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--color-surface-muted)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function InfoBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const toneClasses = {
    neutral: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
    positive: "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]",
    negative: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
    warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]",
  };
  return <span className={`rounded-full px-2.5 py-1 ${toneClasses[tone]}`}>{label}</span>;
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">{text}</div>;
}

function groupSignalsForDisplay(signals: Signal[]) {
  const groups = new Map<string, Signal[]>();
  for (const signal of signals) {
    const key = [
      signal.sourceId.toLowerCase().trim(),
      signal.family,
      signal.correlationKey ?? signal.subtype.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      new Date(signal.occurredAt).toISOString().slice(0, 10),
    ].join(":");
    groups.set(key, [...(groups.get(key) ?? []), signal]);
  }

  return Array.from(groups.entries()).map(([id, groupSignals]) => ({
    id,
    sourceLabel: Array.from(new Set(groupSignals.map((signal) => signal.sourceId))).join(", "),
    signals: groupSignals.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  }));
}

function SourceLink({ event }: { event: SourceEvent }) {
  const url = sourceEventUrl(event);
  if (!url) {
    return (
      <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
        {event.sourceId}: no direct link
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
      title={event.title}
    >
      {event.sourceId}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function formatPoints(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

function formatDecimal(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function plainCopy(value: string) {
  return value
    .replace(/resolution_friction/gi, "wording gap")
    .replace(/formal_announcement/gi, "public wording")
    .replace(/real_end/gi, "real progress")
    .replace(/resolution friction/gi, "wording gap")
    .replace(/friction/gi, "wording gap");
}

function formatAffectedLabel(value: string) {
  return plainCopy(value.replaceAll("_", " "));
}
