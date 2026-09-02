"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SignalPerformanceDay } from "@/hooks/use-signals";

/**
 * Accuracy over time: per-UTC-day hit rate at the 1h horizon across the
 * performance window. The 50% reference line is the coin-flip bar — the
 * whole point of the chart is whether the line lives above it.
 */
export function SignalAccuracyChart({ timeline }: { timeline: SignalPerformanceDay[] }) {
  const data = timeline.filter((d) => d.total > 0);
  if (data.length < 2) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Accuracy chart appears once two or more days have graded signals.
      </p>
    );
  }

  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-1">Daily hit rate · 1h horizon</div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => d.slice(5)}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.5, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <Tooltip content={<AccTip />} />
            <ReferenceLine
              y={0.5}
              stroke="var(--border)"
              strokeDasharray="4 3"
              label={{ value: "coin flip", fontSize: 9, fill: "var(--muted-foreground)", position: "insideBottomRight" }}
            />
            <Line
              dataKey="hitRate1h"
              stroke="#10b981"
              strokeWidth={1.75}
              dot={{ r: 2, fill: "#10b981" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AccTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SignalPerformanceDay }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold tabular-nums">{(d.hitRate1h * 100).toFixed(0)}% right at 1h</div>
      <div className="text-muted-foreground">
        {d.date} · {d.total} graded · avg {d.avgReturn1h * 100 >= 0 ? "+" : ""}
        {(d.avgReturn1h * 100).toFixed(2)}%
      </div>
    </div>
  );
}
