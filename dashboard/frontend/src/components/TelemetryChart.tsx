import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Reading } from "../types";
import { timeOf } from "../lib/format";

interface TelemetryChartProps {
  history: Reading[];
  color: string;
}

interface Point {
  t: string;
  score: number;
  rf: number;
  gas: number;
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 font-mono text-xs">
      <div className="label mb-1 text-[0.58rem]">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-hud" style={{ color: p.color }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular-nums text-bright">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TelemetryChart({ history, color }: TelemetryChartProps) {
  const data: Point[] = history.map((r) => ({
    t: timeOf(r.ts),
    score: r.threat.score,
    rf: Math.round(r.norm.sdr_pct),
    gas: Math.round(r.norm.gas_pct),
  }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: -18, bottom: 0, left: 12 }}>
          <defs>
            <linearGradient id="area-score" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(120,110,70,0.16)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: "#6e6953", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "rgba(120,110,70,0.35)" }}
            tickLine={false}
            minTickGap={48}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            orientation="right"
            tick={{ fill: "#6e6953", fontSize: 10, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(111,122,58,0.35)" }} />

          <Area
            type="monotone"
            name="איום"
            dataKey="score"
            stroke={color}
            strokeWidth={2.4}
            fill="url(#area-score)"
            isAnimationActive={false}
            dot={false}
          />
          <Line
            type="monotone"
            name="תדר"
            dataKey="rf"
            stroke="#46658a"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            name="גז"
            dataKey="gas"
            stroke="#937235"
            strokeWidth={1.6}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
