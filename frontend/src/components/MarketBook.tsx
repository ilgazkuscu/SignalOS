import { Panel } from "./Panel";

type Props = {
  market: any | null;
};

export function MarketBook({ market }: Props) {
  return (
    <Panel title="Selected Contract" subtitle="Focused read on the currently selected market.">
      {market ? (
        <div className="mt-3 space-y-2 text-sm">
          <div className="text-base font-medium text-[var(--color-text)]">{market.question}</div>
          <div className="grid gap-3">
            <div className="rounded-[8px] border border-[var(--color-border)] p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Market Mid</div>
              <div className="mt-2 text-2xl font-semibold">{(market.market_mid * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-[8px] border border-[var(--color-border)] p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Model Probability</div>
              <div className="mt-2 text-2xl font-semibold">{(market.model_prob * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-[8px] border border-[var(--color-border)] p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Liquidity</div>
              <div className="mt-2 text-xl font-semibold">${Math.round(market.liquidity || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-[var(--color-text-muted)]">Pick a market from the market map.</div>
      )}
    </Panel>
  );
}
