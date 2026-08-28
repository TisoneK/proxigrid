"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatPrice } from "@/lib/utils/format";
import type { Candle } from "@/hooks/use-candles";

interface PriceChartProps {
  candles: Candle[];
  height?: number;
}

// Emerald-500 / rose-500 — literal colors so recharts' SVG stroke resolves
// them in both themes (CSS vars don't resolve as SVG presentation attributes).
const UP = "#10b981";
const DOWN = "#f43f5e";

export function PriceChart({ candles, height = 220 }: PriceChartProps) {
  if (!candles || candles.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No chart data
      </div>
    );
  }

  const data = candles.map((c) => ({ t: c.closeTime, price: c.close }));
  const up = data[data.length - 1].price >= data[0].price;
  const color = up ? UP : DOWN;
  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price));
  const pad = (max - min) * 0.08 || max * 0.01;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.26} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis domain={[min - pad, max + pad]} hide />
          <Tooltip content={<ChartTip />} cursor={{ stroke: color, strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#priceFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { t: number } }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold tabular-nums">{formatPrice(p.value)}</div>
      <div className="text-muted-foreground">{new Date(p.payload.t).toLocaleString()}</div>
    </div>
  );
}
