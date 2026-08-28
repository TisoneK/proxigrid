"use client";

import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/utils/format";
import type { Candle } from "@/hooks/use-candles";

export type ChartMode = "area" | "candles";

interface PriceChartProps {
  candles: Candle[];
  height?: number;
  mode?: ChartMode;
}

// Emerald-500 / rose-500 — literal colors so recharts' SVG stroke resolves
// them in both themes (CSS vars don't resolve as SVG presentation attributes).
const UP = "#10b981";
const DOWN = "#f43f5e";

export function PriceChart({ candles, height = 220, mode = "area" }: PriceChartProps) {
  if (!candles || candles.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-sm text-muted-foreground">
        No chart data
      </div>
    );
  }

  return mode === "candles" ? (
    <CandleChart candles={candles} height={height} />
  ) : (
    <AreaPriceChart candles={candles} height={height} />
  );
}

function AreaPriceChart({ candles, height }: { candles: Candle[]; height: number }) {
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

function CandleChart({ candles, height }: { candles: Candle[]; height: number }) {
  const data = candles.map((c) => ({
    t: c.closeTime,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    // Range bar spans low→high; the custom shape draws the wick + body from it.
    range: [c.low, c.high] as [number, number],
  }));
  const min = Math.min(...data.map((d) => d.low));
  const max = Math.max(...data.map((d) => d.high));
  const pad = (max - min) * 0.08 || max * 0.01;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="t" hide />
          <YAxis domain={[min - pad, max + pad]} hide />
          <Tooltip content={<CandleTip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
          <Bar dataKey="range" shape={<Candlestick />} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom Bar shape: recharts resolves `y`/`height` for the [low, high] range,
// giving a pixel scale we reuse to place the open/close body.
function Candlestick(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { open: number; high: number; low: number; close: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { open, high, low, close } = payload;
  const span = high - low;
  const pxPerPrice = span > 0 ? height / span : 0;
  const yOf = (p: number) => y + (high - p) * pxPerPrice;

  const up = close >= open;
  const color = up ? UP : DOWN;
  const cx = x + width / 2;
  const bodyTop = yOf(Math.max(open, close));
  const bodyBottom = yOf(Math.min(open, close));
  const bodyH = Math.max(bodyBottom - bodyTop, 1);
  const bodyW = Math.max(width * 0.6, 1);

  return (
    <g>
      {/* wick */}
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      {/* body */}
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} />
    </g>
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

function CandleTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { t: number; open: number; high: number; low: number; close: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  const up = c.close >= c.open;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md space-y-0.5">
      <div className={up ? "font-semibold text-emerald-500" : "font-semibold text-rose-500"}>
        {formatPrice(c.close)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground tabular-nums">
        <span>O {formatPrice(c.open)}</span>
        <span>H {formatPrice(c.high)}</span>
        <span>L {formatPrice(c.low)}</span>
        <span>C {formatPrice(c.close)}</span>
      </div>
      <div className="text-muted-foreground/70">{new Date(c.t).toLocaleString()}</div>
    </div>
  );
}
