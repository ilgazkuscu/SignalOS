import { Panel } from "./Panel";

type Props = {
  features: Record<string, any>;
};

const keys = ["p3_trigger", "p4_trigger", "ordered_departure_iraq", "israeli_activity_spike", "trump_two_weeks_pattern"];

export function SignalTimeline({ features }: Props) {
  return (
    <Panel title="Signal Conditions" subtitle="Composite indicators currently shaping the phase estimate.">
      <div className="flex flex-wrap gap-3">
        {keys.map((key) => (
          <div
            key={key}
            className={`rounded-[8px] border px-3 py-2 text-sm ${
              features[key]
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {key}
          </div>
        ))}
      </div>
    </Panel>
  );
}
