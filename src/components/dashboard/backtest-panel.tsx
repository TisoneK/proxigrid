"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickers } from "@/hooks/use-ticker";
import { useCandles } from "@/hooks/use-candles";
import { runBacktest, DEFAULT_PARAMS, type Strategy } from "@/lib/backtest";
import { coinIdentity } from "@/lib/coins";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const TIMEFRAMES = ["1h", "4h", "1d"] as const;

export function BacktestPanel() {
  const { data: tickers } = useTickers("binance");
  const [symbol, setSymbol] = React.useState("BTCUSDT");
  const [interval, setInterval] = React.useState<string>("1h");
  const [strategy, setStrategy] = React.useState<Strategy>("ma_crossover");
  const [fastMA, setFastMA] = React.useState(DEFAULT_PARAMS.fastMA);
  const [slowMA, setSlowMA] = React.useState(DEFAULT_PARAMS.slowMA);
  const [rsiPeriod, setRsiPeriod] = React.useState(DEFAULT_PARAMS.rsiPeriod);
  const [oversold, setOversold] = React.useState(DEFAULT_PARAMS.oversold);
  const [overbought, setOverbought] = React.useState(DEFAULT_PARAMS.overbought);

  const { data: candles, isLoading } = useCandles(symbol, interval, 200);

  const result = React.useMemo(() => {
    if (!candles || candles.length < 5) return null;
    return runBacktest(candles, {
      strategy,
      fastMA,
      slowMA,
      rsiPeriod,
      oversold,
      overbought,
    });
  }, [candles, strategy, fastMA, slowMA, rsiPeriod, oversold, overbought]);

  const chartData = React.useMemo(
    () =>
      (candles ?? []).map((c, i) => ({
        t: c.closeTime,
        price: c.close,
        fast: result?.fast[i] ?? null,
        slow: strategy === "ma_crossover" ? result?.slow[i] ?? null : null,
      })),
    [candles, result, strategy]
  );

  const ret = result?.totalReturnPct ?? 0;
  const gross = result?.grossReturnPct ?? 0;
  const symbols = (tickers ?? []).map((t) => t.symbol).slice(0, 40);

  return (
    <div className="card-premium lit-top p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Strategy backtester</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test a strategy on the last 200 candles before automating it
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(symbols.includes(symbol) ? symbols : [symbol, ...symbols]).map((s) => (
                <SelectItem key={s} value={s}>
                  {coinIdentity(s).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setInterval(tf)}
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded-md transition-colors",
                  interval === tf ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {isLoading || !result ? (
        <Skeleton className="h-[260px] w-full rounded-lg" />
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
              <YAxis domain={["auto", "auto"]} hide />
              <Tooltip content={<Tip />} />
              {strategy === "ma_crossover" && (
                <>
                  <Line dataKey="fast" stroke="#22c55e" dot={false} strokeWidth={1.25} isAnimationActive={false} connectNulls />
                  <Line dataKey="slow" stroke="#f59e0b" dot={false} strokeWidth={1.25} isAnimationActive={false} connectNulls />
                </>
              )}
              <Line dataKey="price" stroke="#3b82f6" dot={false} strokeWidth={1.75} isAnimationActive={false} />
              {result.trades.map((tr) => (
                <ReferenceDot
                  key={`${tr.side}-${tr.index}`}
                  x={tr.time}
                  y={tr.price}
                  r={5}
                  fill={tr.side === "buy" ? "#22c55e" : "#ef4444"}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-y border-border my-4">
        <Metric label="Total return (net)" value={`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`} tone={ret > 0 ? "up" : ret < 0 ? "down" : "flat"} />
        <Metric label="Gross (no costs)" value={`${gross >= 0 ? "+" : ""}${gross.toFixed(1)}%`} tone={gross > 0 ? "up" : gross < 0 ? "down" : "flat"} />
        <Metric label="Win rate" value={result ? `${(result.winRate * 100).toFixed(0)}%` : "—"} />
        <Metric label="Trades" value={String(result?.totalTrades ?? 0)} />
      </div>
      <p className="text-[10px] text-muted-foreground/70 -mt-2 mb-3 text-center">
        Net of {(DEFAULT_PARAMS.feeBps! / 100).toFixed(2)}% fee + {(DEFAULT_PARAMS.slippageBps! / 100).toFixed(2)}% slippage per side — the bar a live strategy must clear.
      </p>

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Signal strategy</div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-secondary">
            <StrategyTab active={strategy === "ma_crossover"} onClick={() => setStrategy("ma_crossover")}>
              MA Crossover
            </StrategyTab>
            <StrategyTab active={strategy === "rsi_reversion"} onClick={() => setStrategy("rsi_reversion")}>
              RSI Reversion
            </StrategyTab>
          </div>
        </div>

        {strategy === "ma_crossover" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <ParamSlider label="Fast MA lookback" value={fastMA} min={2} max={40} onChange={setFastMA} unit="periods" />
            <ParamSlider label="Slow MA lookback" value={slowMA} min={5} max={100} onChange={setSlowMA} unit="periods" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <ParamSlider label="RSI period" value={rsiPeriod} min={2} max={30} onChange={setRsiPeriod} unit="periods" />
            <ParamSlider label="Oversold" value={oversold} min={10} max={45} onChange={setOversold} />
            <ParamSlider label="Overbought" value={overbought} min={55} max={90} onChange={setOverbought} />
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "py-2 rounded-md text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "flat" }) {
  return (
    <div className="text-center py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums mt-0.5",
          tone === "up" && "text-emerald-600 dark:text-emerald-400",
          tone === "down" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Tip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { t: number } }> }) {
  if (!active || !payload?.length) return null;
  const price = payload.find(() => true);
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-semibold tabular-nums">{formatPrice(price?.value ?? 0)}</div>
      <div className="text-muted-foreground">{new Date(payload[0].payload.t).toLocaleString()}</div>
    </div>
  );
}
