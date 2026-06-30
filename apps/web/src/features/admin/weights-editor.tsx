import React from "react";
import type { WeightProfile } from "@/lib/types/domain";
import { Panel } from "@/components/panel";

export function WeightsEditor({ profiles }: { profiles: WeightProfile[] }) {
  const featureNarratives = [
    {
      title: "Separate Facts From Rules",
      why: "A headline can sound important but still not count under the rules.",
      how:
        "SignalOS checks both the real event and the rule language.",
      investorCase:
        "The user knows whether to act, wait, or ignore the noise.",
    },
    {
      title: "Rule Check",
      why: "Some headlines move fast, but the wording may still be weak.",
      how:
        "The product checks whether the wording is strong enough.",
      investorCase:
        "The user sees when to stay in watch mode.",
    },
    {
      title: "Evidence Log",
      why: "People trust a prediction more when they can see the facts behind it.",
      how:
        "Every useful item is saved with a source, score, and reason.",
      investorCase:
        "The prediction is explainable, not a black box.",
    },
    {
      title: "What-If Planning",
      why: "Teams need to know what would change the decision.",
      how:
        "The app tests possible future events and shows the impact.",
      investorCase:
        "Users can prepare before the news breaks.",
    },
    {
      title: "Step-by-step proof",
      why: "A demo needs proof, not just a nice story.",
      how:
        "Proof shows what the app knew at each point in time.",
      investorCase:
        "It proves what changed and when.",
    },
    {
      title: "Live, But Stable",
      why: "A demo should feel live without breaking.",
      how:
        "The app uses live data when it can and sample data when needed.",
      investorCase:
        "The screen stays useful even when a source is slow.",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Alert Sensitivity" subtitle="How easily news changes the prediction.">
        <div className="space-y-4">
          {profiles.map((profile) => (
            <div key={profile.key} className="rounded-2xl border border-[var(--color-border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{profile.label}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">{plainCopy(profile.description)}</p>
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">Older news fades after {profile.recencyHalfLifeHours}h</div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {Object.entries(profile.familyWeights).map(([family, weight]) => (
                  <div key={family} className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
                    {family}: {(weight * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                Trust {profile.confidenceMultiplier.toFixed(2)} · Conflicts {profile.contradictionPenalty.toFixed(2)} · Repeats {profile.correlationPenalty.toFixed(2)} · Rule gap {profile.resolutionFrictionWeight.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Demo Readiness" subtitle="Is the demo ready to show?">
        <div className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Access</div>
            <div className="mt-2">Local demo mode. Add login before team use.</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Data</div>
            <div className="mt-2">Sample data keeps the demo stable. Live data works when enabled.</div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <div className="font-semibold text-[var(--color-text)]">Pages</div>
            <div className="mt-2">Brief, evidence, proof, rules, and prediction pages are connected.</div>
          </div>
        </div>
      </Panel>
      </div>

      <Panel
        title="Why This Product Matters"
        subtitle="What the app does and why it helps."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {featureNarratives.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-[var(--color-border)] p-5">
              <div className="text-lg font-semibold">{feature.title}</div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--color-text-muted)]">
                <div>
                  <div className="font-semibold text-[var(--color-text)]">Problem</div>
                  <p className="mt-1">{feature.why}</p>
                </div>
                <div>
                  <div className="font-semibold text-[var(--color-text)]">What it does</div>
                  <p className="mt-1">{feature.how}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="font-semibold text-[var(--color-text)]">Result</div>
                  <p className="mt-1">{feature.investorCase}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Showcase Summary"
        subtitle="Short interview framing."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Not just a dashboard"
            body="SignalOS turns raw news into a clear action."
          />
          <SummaryCard
            title="Built for decisions"
            body="The user sees what changed and what to do next."
          />
          <SummaryCard
            title="Proof is built in"
            body="Every update links back to the news that caused it."
          />
        </div>
      </Panel>
    </div>
  );
}

function plainCopy(value: string) {
  return value.replace(/resolution friction/gi, "wording gap").replace(/friction/gi, "wording gap");
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] p-4">
      <div className="text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{body}</p>
    </div>
  );
}
