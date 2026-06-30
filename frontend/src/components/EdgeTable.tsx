import { Panel } from "./Panel";

type Props = {
  markets: any[];
  onSelect?: (tokenId: string) => void;
  selectedToken?: string | null;
};

export function EdgeTable({ markets, onSelect, selectedToken }: Props) {
  return (
    <Panel title="Market Map" subtitle="Model-vs-market dislocations across the current Iran-linked board.">
      <div className="overflow-hidden rounded-[8px] border border-[var(--color-border)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-black/20 text-[var(--color-text-muted)]">
          <tr>
            <th className="p-3">Question</th>
            <th className="p-3">Mid</th>
            <th className="p-3">Model</th>
            <th className="p-3">Edge</th>
            <th className="p-3">Size</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market) => (
            <tr
              key={market.token_id}
              className={`cursor-pointer border-t ${
                selectedToken === market.token_id ? "bg-[var(--color-accent-soft)]" : "hover:bg-white/5"
              }`}
              onClick={() => onSelect?.(market.token_id)}
            >
              <td className="p-3">{market.question}</td>
              <td className="p-3">{(market.market_mid * 100).toFixed(1)}%</td>
              <td className="p-3">{(market.model_prob * 100).toFixed(1)}%</td>
              <td className={`p-3 ${market.edge > 0 ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`}>
                {(market.edge * 100).toFixed(1)}c
              </td>
              <td className="p-3">${Math.round(market.size_recommended || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Panel>
  );
}
