"use client";

import React from "react";
import Image from "next/image";
import { Panel } from "@/components/panel";
import type { FamilyEngineOutput, MarketFamily } from "@/modules/markets";
import { sourceDomain } from "@/modules/intelligence";

interface SignalOsModelMeta {
  hmm: {
    feature_columns: string[];
  };
}

interface Model2Payload {
  phase: {
    features: Record<string, number>;
    observed_at?: string;
    change_monitor?: Array<{ name: string; previous: number; current: number; delta: number; observed_at?: string; previous_observed_at?: string }>;
    signal_pulses?: Array<{ name: string; values: number[]; current: number; timestamps?: string[]; observed_at?: string }>;
    pca?: {
      window_size: number;
      observed_at?: string;
      components: Array<{
        name: string;
        explained_variance_ratio: number;
        score: number;
        top_loadings: Array<{ feature: string; loading: number }>;
      }>;
    } | null;
    source?: string;
    source_note?: string;
    last_update: string;
  };
  model: SignalOsModelMeta;
}

const FALLBACK_SOURCE_LINKS: Record<
  string,
  {
    url: string;
    label: string;
  }
> = {
  adsb: {
    url: "https://globe.adsbexchange.com/",
    label: "ADSB Exchange Live",
  },
  satellite: {
    url: "https://browser.dataspace.copernicus.eu/",
    label: "Copernicus Browser",
  },
  usni: {
    url: "https://news.usni.org/category/fleet-tracker",
    label: "USNI Fleet Tracker",
  },
  state: {
    url: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/",
    label: "State Advisories",
  },
  news: {
    url: "https://www.reuters.com/world/middle-east/",
    label: "Reuters Mideast",
  },
  whitehouse: {
    url: "https://www.whitehouse.gov/briefing-room/statements-releases/",
    label: "WH Statements",
  },
  signalos: {
    url: "http://127.0.0.1:8000/current_phase/model",
    label: "SignalOS Model Feed",
  },
};

function sourceIconUrl(url?: string) {
  const domain = sourceDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : "";
}

const FEATURE_NEWS_MATCHERS: Record<
  string,
  {
    preferredSources?: string[];
    keywords: string[];
  }
> = {
  tanker_sortie_z: {
    preferredSources: ["wsj-world", "reuters", "bbc-world"],
    keywords: ["tanker", "aircraft", "air force", "flight", "sortie", "deployment"],
  },
  b2_dg_ramp_count: {
    preferredSources: ["reuters", "bbc-world", "wsj-world"],
    keywords: ["b-2", "diego garcia", "bomber", "airbase", "satellite"],
  },
  csg_centcom_count: {
    preferredSources: ["usni", "reuters", "bbc-world"],
    keywords: ["carrier", "fleet", "strike group", "nimitz", "vinson", "ford"],
  },
  ordered_departure_iraq: {
    preferredSources: ["whitehouse-news", "bbc-world", "reuters"],
    keywords: ["ordered departure", "state department", "embassy", "travel advisory", "iraq"],
  },
  israeli_activity_spike: {
    preferredSources: ["reuters", "bbc-world", "nyt-world"],
    keywords: ["israel", "iran", "strike", "idf", "missile", "airstrike"],
  },
  trump_two_weeks_pattern: {
    preferredSources: ["whitehouse-news", "whitehouse-fact-sheets", "reuters"],
    keywords: ["trump", "two weeks", "statement", "white house", "briefing room"],
  },
  signal_quality_score_composite: {
    preferredSources: [],
    keywords: [],
  },
};

function resolveFeatureSourceLink(feature: string, output: FamilyEngineOutput) {
  const matcher = FEATURE_NEWS_MATCHERS[feature];
  if (matcher) {
    const matchedNews = output.news
      .filter((item) => {
        if (!item.url) return false;
        const haystack = `${item.headline} ${item.source}`.toLowerCase();
        const sourceOk = !matcher.preferredSources?.length || matcher.preferredSources.includes(item.source);
        const keywordOk = !matcher.keywords.length || matcher.keywords.some((keyword) => haystack.includes(keyword));
        return sourceOk && keywordOk;
      })
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];

    if (matchedNews?.url) {
      return {
        url: matchedNews.url,
        label: sourceDomain(matchedNews.url) || matchedNews.source,
        timestamp: matchedNews.timestamp,
      };
    }
  }

  return {
    ...(FALLBACK_SOURCE_LINKS[FEATURE_SPECS[feature]?.source ?? "signalos"] ?? FALLBACK_SOURCE_LINKS.signalos),
    timestamp: undefined,
  };
}

const FEATURE_SPECS: Record<
  string,
  {
    label: string;
    source: string;
    rationale: string;
    magnitudeScale: number;
    confidence: number;
    bucketInfluence: number[];
  }
> = {
  tanker_sortie_z: {
    label: "tanker sortie z-score",
    source: "adsb",
    rationale: "Tanker bridge formation is the shortest-horizon logistics tell in the SignalOS Iran stack.",
    magnitudeScale: 3,
    confidence: 0.94,
    bucketInfluence: [95, 90, 72, 54],
  },
  b2_dg_ramp_count: {
    label: "B-2 Diego Garcia posture",
    source: "satellite",
    rationale: "Ramp posture at Diego Garcia is the cleanest public proxy for deep-strike readiness.",
    magnitudeScale: 4,
    confidence: 0.91,
    bucketInfluence: [78, 88, 70, 52],
  },
  csg_centcom_count: {
    label: "carrier stack",
    source: "usni",
    rationale: "Carrier count changes shape the broader strike and deterrence envelope across the theater.",
    magnitudeScale: 2,
    confidence: 0.82,
    bucketInfluence: [62, 76, 74, 58],
  },
  ordered_departure_iraq: {
    label: "ordered departure",
    source: "state",
    rationale: "Ordered departure is a late diplomatic security tell that often arrives close to operational tightening.",
    magnitudeScale: 1,
    confidence: 0.88,
    bucketInfluence: [72, 86, 83, 68],
  },
  israeli_activity_spike: {
    label: "Israeli activity spike",
    source: "news",
    rationale: "Partner military tempo is a useful conditioning signal in the June 2025 Iran template.",
    magnitudeScale: 1,
    confidence: 0.74,
    bucketInfluence: [66, 84, 72, 56],
  },
  trump_two_weeks_pattern: {
    label: "two-weeks anti-tell",
    source: "whitehouse",
    rationale: "Delay rhetoric is treated as an anti-tell only when it pairs with hard logistics and execute signals.",
    magnitudeScale: 1,
    confidence: 0.69,
    bucketInfluence: [88, 93, 61, 44],
  },
  signal_quality_score_composite: {
    label: "signal quality composite",
    source: "signalos",
    rationale: "The composite score concentrates the high-reliability, deception-adjusted inputs used by the live model.",
    magnitudeScale: 1,
    confidence: 0.93,
    bucketInfluence: [58, 74, 82, 88],
  },
};

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatImpact(value: number) {
  const points = Math.round(value * 100);
  return `${points >= 0 ? "+" : ""}${points}`;
}

function featureDisplayName(feature: string) {
  return FEATURE_SPECS[feature]?.label ?? feature.replaceAll("_", " ");
}

function featureDisplayType(feature: string) {
  return featureDisplayName(feature).toUpperCase();
}

export function Signals2Tab({
  family,
  output,
  model2Data = null,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
  model2Data?: Model2Payload | null;
}) {
  const [weights, setWeights] = React.useState<Record<string, number>>(
    () => Object.fromEntries((model2Data?.model.hmm.feature_columns ?? []).map((feature) => [feature, 1])),
  );
  const [error, setError] = React.useState<string | null>(null);
  const payload = model2Data;

  React.useEffect(() => {
    if (!model2Data) return;
    setError(null);
    setWeights((current) => {
      if (Object.keys(current).length) return current;
      return Object.fromEntries(model2Data.model.hmm.feature_columns.map((feature) => [feature, 1]));
    });
  }, [model2Data]);

  if (error) {
    return (
      <Panel title="Signals2" subtitle="Model2 feature feed from the active SignalOS engine.">
        <div className="rounded-[8px] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger-text)]">
          {error}
        </div>
      </Panel>
    );
  }

  if (!payload) {
    return (
      <Panel title="Signals2" subtitle="Model2 feature monitor built from the active phase-engine inputs.">
        <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Signals2 is waiting for Model2 data from the shared workspace payload.
        </div>
      </Panel>
    );
  }

  const fallbackMode = payload.phase.source === "workspace-derived-fallback";
  const featureColumns = payload.model.hmm.feature_columns;
  const scoredSignals = featureColumns
    .map((feature) => {
      const spec = FEATURE_SPECS[feature];
      const resolvedSource = resolveFeatureSourceLink(feature, output);
      const currentValue = Number(payload.phase.features[feature] ?? 0);
      const weight = weights[feature] ?? 1;
      const normalizedMagnitude = clamp(spec ? currentValue / spec.magnitudeScale : currentValue);
      const adjustedImpact = normalizedMagnitude * (spec?.confidence ?? 0.75) * weight;

      return {
        id: feature,
        signalType: featureDisplayType(feature),
        title: featureDisplayName(feature),
        source: spec?.source ?? "signalos",
        sourceUrl: resolvedSource?.url,
        sourceLabel: resolvedSource?.label ?? "Source",
        timestamp:
          resolvedSource?.timestamp ??
          payload.phase.change_monitor?.find((item) => item.name === feature)?.observed_at ??
          payload.phase.signal_pulses?.find((item) => item.name === feature)?.observed_at ??
          payload.phase.observed_at ??
          payload.phase.last_update,
        rationale: spec?.rationale ?? "Live SignalOS model feature.",
        magnitude: normalizedMagnitude,
        confidence: spec?.confidence ?? 0.75,
        weight,
        adjustedImpact,
        rawValue: currentValue,
      };
    })
    .sort((left, right) => right.adjustedImpact - left.adjustedImpact);

  const activeSignals = scoredSignals.filter((signal) => signal.rawValue > 0);
  const monitoredSignals = scoredSignals.slice(0, 8);

  const timelineRows = (payload.phase.change_monitor?.length
    ? payload.phase.change_monitor.map((item) => ({
        id: item.name,
        signalType: featureDisplayType(item.name),
        title: featureDisplayName(item.name),
        rationale: `${FEATURE_SPECS[item.name]?.rationale ?? "SignalOS feature change."} Delta ${item.delta > 0 ? "+" : ""}${item.delta.toFixed(2)} from the previous window.`,
      }))
    : featureColumns.map((feature) => ({
        id: feature,
        signalType: featureDisplayType(feature),
        title: featureDisplayName(feature),
        rationale: FEATURE_SPECS[feature]?.rationale ?? "SignalOS feature.",
      })));

  const mappingRows = featureColumns.map((feature) => {
    const spec = FEATURE_SPECS[feature];
    const weight = weights[feature] ?? 1;
    return {
      feature,
      impacts: output.buckets.map((_, index) => Math.min(100, Math.round((spec?.bucketInfluence[index] ?? 0) * weight))),
    };
  });

  return (
    <div className="space-y-5">
      <Panel title="Signals2" subtitle="Model2 feature monitor built from the active phase-engine inputs.">
        {fallbackMode ? (
          <div className="mb-4 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Standalone SignalOS is offline, so this tab is using workspace-derived feature inputs from the current signals, timeline, and market state.
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-4">
          <MetricCard label="Features watched" value={String(featureColumns.length)} />
          <MetricCard label="Active now" value={String(activeSignals.length)} />
          <MetricCard label="Changed recently" value={String(payload.phase.change_monitor?.length ?? 0)} />
          <MetricCard label="Last refresh" value={formatTimestamp(payload.phase.last_update)} />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Panel title="Weight Controls" subtitle="Session-only what-if controls for the actual Model2 feature stack.">
            <div className="space-y-4">
              {featureColumns.map((feature) => {
                const value = weights[feature] ?? 1;
                return (
                  <label key={feature} className="block">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-[var(--color-text)]">{featureDisplayName(feature)}</span>
                      <span className="text-[var(--color-text-muted)]">{value.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={value}
                      onChange={(event) => setWeights((current) => ({ ...current, [feature]: Number(event.target.value) }))}
                      className="w-full"
                    />
                  </label>
                );
              })}
            </div>
          </Panel>

          <Panel title="Signal-to-Bucket Mapping" subtitle="How the real Model2 features map into the active Iran endgame deadline ladder.">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    <th className="border-b border-[var(--color-border)] px-0 py-3 pr-4">Signal</th>
                    {output.buckets.map((bucket) => (
                      <th key={bucket.id} className="border-b border-[var(--color-border)] px-0 py-3 pr-4">
                        {bucket.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappingRows.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm font-semibold text-[var(--color-text)]">
                        {featureDisplayName(row.feature)}
                      </td>
                      {row.impacts.map((impact, index) => (
                        <td key={`${row.feature}-${output.buckets[index]?.id ?? index}`} className="border-b border-[var(--color-border)] px-0 py-4 pr-4 text-sm text-[var(--color-text-muted)]">
                          {impact}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {payload.phase.pca ? (
            <Panel
              title="Feature PCA"
              subtitle={`Principal-component view across the last ${payload.phase.pca.window_size} feature rows.`}
            >
              <div className="space-y-4">
                {payload.phase.pca.components.map((component) => (
                  <div key={component.name} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text)]">{component.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                          Explained variance {(component.explained_variance_ratio * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[var(--color-text)]">
                        Score {component.score >= 0 ? "+" : ""}{component.score.toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {component.top_loadings.map((loading) => (
                        <div key={`${component.name}-${loading.feature}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-[var(--color-text-muted)]">{featureDisplayName(loading.feature)}</span>
                          <span className="font-mono text-[var(--color-text)]">
                            {loading.loading >= 0 ? "+" : ""}{loading.loading.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel title="Active Signals" subtitle="Model2 features with real signal contribution, or the monitored stack when the tape is quiet.">
            {activeSignals.length ? (
              <div className="space-y-3">
                {activeSignals.map((signal) => (
                  <Model2SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {monitoredSignals.map((signal) => (
                  <Model2SignalCard key={signal.id} signal={signal} inactive />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Signal Timeline" subtitle="Chronological feed of the actual features used by Model2 and their latest changes.">
            <div className="space-y-3">
              {timelineRows.map((signal) => (
                <div key={`${signal.id}-timeline`} className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{signal.signalType}</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{signal.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{signal.rationale}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Model2SignalCard({
  signal,
  inactive = false,
}: {
  signal: {
    id: string;
    signalType: string;
    title: string;
    source: string;
    sourceUrl?: string;
    sourceLabel?: string;
    timestamp: string;
    rationale: string;
    magnitude: number;
    confidence: number;
    weight: number;
    adjustedImpact: number;
    rawValue: number;
  };
  inactive?: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{signal.signalType}</div>
          <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{signal.title}</div>
        </div>
        <div className={`text-sm font-semibold ${inactive ? "text-[var(--color-text-muted)]" : "text-[var(--color-positive-text)]"}`}>
          {inactive ? "0" : formatImpact(signal.adjustedImpact)}
        </div>
      </div>
      <div className="mt-2 text-sm text-[var(--color-text-muted)]">
        {signal.source}
        {signal.sourceUrl ? (
          <>
            {" "}
            ·{" "}
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 underline decoration-[var(--color-border-strong)] underline-offset-2 hover:text-[var(--color-text)]"
            >
              {sourceIconUrl(signal.sourceUrl) ? (
                <Image
                  src={sourceIconUrl(signal.sourceUrl)}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-[4px] border border-[var(--color-border)] bg-white/90 object-cover"
                />
              ) : null}
              <span>{signal.sourceLabel ?? (sourceDomain(signal.sourceUrl) || "source")}</span>
            </a>
          </>
        ) : null}{" "}
        · {formatTimestamp(signal.timestamp)}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{signal.rationale}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        <span>Magnitude {(signal.magnitude * 100).toFixed(0)}%</span>
        <span>Confidence {(signal.confidence * 100).toFixed(0)}%</span>
        <span>Weight {signal.weight.toFixed(2)}</span>
        <span>Raw {formatValue(signal.rawValue)}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-base font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
