import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "./Panel";

type Props = {
  replay: any;
};

export function BacktestChart({ replay }: Props) {
  const data = replay.timestamps.map((ts: string, index: number) => ({
    ts,
    detector: replay.detector_prob[index],
    market: replay.market_mid[index]
  }));

  return (
    <Panel title="Replay" subtitle="Detector probability versus public market pricing around Midnight Hammer.">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="ts" hide />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Line type="monotone" dataKey="detector" stroke="#2dd4bf" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="market" stroke="#f59e0b" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
