"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/panel";
import type { FamilyBucketRow, FamilyEngineOutput, MarketFamily } from "@/modules/markets";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function signedGap(value: number) {
  const points = Math.round(value * 100);
  return `${points > 0 ? "+" : ""}${points}pts`;
}

function topDisagreement(output: FamilyEngineOutput) {
  return [...output.buckets].sort((left, right) => Math.abs(right.gap) - Math.abs(left.gap))[0] ?? null;
}

function gapMeaning(bucket: FamilyBucketRow | null) {
  if (!bucket) return "No open date is active right now, so this page is in proof mode.";
  if (bucket.gap > 0) return "SignalOS thinks YES is more likely than the outside view.";
  if (bucket.gap < 0) return "The outside view thinks YES is more likely than SignalOS.";
  return "SignalOS and the outside view are roughly aligned.";
}

export function HowToTab({
  family,
  output,
}: {
  family: MarketFamily;
  output: FamilyEngineOutput;
}) {
  const isHormuz = family.id === "hormuz-closure";
  const focusBucket = topDisagreement(output);
  const polymarketUrl = family.polymarketEventUrl;

  return (
    <div className="space-y-5">
      <Panel
        title={isHormuz ? "Start Here: The Hormuz Bet" : `Start Here: ${family.displayName}`}
        subtitle="Plain English guide for a first-time visitor."
      >
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4 text-sm leading-7 text-[var(--color-text-muted)]">
            <p>
              {isHormuz
                ? "This page tracks a real prediction market about whether Trump or the U.S. formally announces that the Strait of Hormuz blockade has been lifted by a specific deadline."
                : `This page tracks a real prediction market for ${family.displayName}.`}
            </p>
            <p>
              The key is wording. The market is not just asking whether the situation feels calmer. It is asking whether an official statement arrives in time and uses language that qualifies.
            </p>
            <p>
              SignalOS compares the outside view with its own score from news, official language, timing, price movement, and related evidence. The useful number is the gap between those two views.
            </p>
          </div>
          <div className="grid gap-3">
            <ReaderStat label="Prediction" value={pct(output.aggregateModelProbability)} detail="SignalOS estimate" />
            <ReaderStat label="Outside view" value={pct(output.aggregateMarketProbability)} detail="Public odds" />
            <ReaderStat label="Gap" value={signedGap(output.gap)} detail="Prediction minus outside view" />
          </div>
        </div>
      </Panel>

      <Panel title="What The Gap Means" subtitle="The fastest way to read the screen.">
        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Current plain-English read</div>
            <div className="mt-2 text-xl font-semibold text-[var(--color-text)]">{gapMeaning(focusBucket)}</div>
            {focusBucket ? (
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                The biggest disagreement is {focusBucket.label}: SignalOS {pct(focusBucket.modelProbability)}, outside view {pct(focusBucket.marketProbability)}, gap {signedGap(focusBucket.gap)}.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                No open date remains here. Use Proof to judge how the system behaved when the question was active.
              </p>
            )}
          </div>
          <div className="grid gap-3 text-sm leading-6 text-[var(--color-text-muted)] md:grid-cols-3">
            <ExplainerBlock title="Positive gap" body="The app thinks YES is more likely than the outside view." />
            <ExplainerBlock title="Negative gap" body="The outside view is higher than the app supports." />
            <ExplainerBlock title="Near zero" body="The edge is mostly gone, so the app becomes a monitoring tool." />
          </div>
        </div>
      </Panel>

      <Panel title="One Minute Tour" subtitle="Use this when a recruiter, professor, or editor opens the portfolio link.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TourStep number="1" title="Pick the question" body="Current Question shows what the app is tracking." />
          <TourStep number="2" title="Read the top line" body="Overview shows the app prediction, the outside view, and the gap." />
          <TourStep number="3" title="Check why" body="Evidence and News show what moved the score." />
          <TourStep number="4" title="Check proof" body="Proof shows whether the app changed after each news item." />
        </div>
      </Panel>

      <Panel title="Evidence Used" subtitle="No black box: each item is meant to be understandable.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <ExplainerBlock title="Official words" body="Does a public statement actually say the blockade is lifted?" />
          <ExplainerBlock title="Timing" body="Which date is still active, and how much time is left?" />
          <ExplainerBlock title="News" body="Major reporting is scored for relevance and whether it supports or weakens YES." />
          <ExplainerBlock title="Shipping pressure" body="Oil, tanker, and Gulf shipping context helps separate real pressure from noise." />
          <ExplainerBlock title="Outside view" body="Price changes show when the public view is moving faster than headlines." />
        </div>
      </Panel>

      <Panel title="What I Built" subtitle="Portfolio version in one sentence.">
        <div className="space-y-4">
          <p className="max-w-5xl text-lg font-semibold leading-8 text-[var(--color-text)]">
            SignalOS is a working web app that watches news and public odds, turns updates into evidence, and explains when its prediction disagrees with the outside view.
          </p>
          <div className="flex flex-wrap gap-3">
            <QuickLink href={`/dashboard?family=${family.id}&tab=dashboard`} label="Open Overview" />
            <QuickLink href={`/dashboard?family=${family.id}&tab=signals`} label="See Evidence" />
            <QuickLink href={`/dashboard?family=${family.id}&tab=news`} label="See News" />
            <QuickLink href={`/dashboard?family=${family.id}&tab=replay`} label="See Proof" />
            {polymarketUrl ? <QuickLink href={polymarketUrl} label="Original Question" external /> : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ReaderStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--color-text)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{detail}</div>
    </div>
  );
}

function ExplainerBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function TourStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-accent-soft)] text-sm font-semibold text-[var(--color-accent)]">
        {number}
      </div>
      <div className="mt-4 text-sm font-semibold text-[var(--color-text)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-accent)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
    >
      {label}
      {external ? <ExternalLink className="h-4 w-4" /> : null}
    </a>
  );
}
