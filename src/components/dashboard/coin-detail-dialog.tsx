"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoinLogo } from "@/components/dashboard/coin-logo";
import { WatchStar } from "@/components/dashboard/watch-star";
import { PriceChart, type ChartMode } from "@/components/dashboard/price-chart";
import { LineChart as LineChartIcon, CandlestickChart as CandlestickIcon } from "lucide-react";
import { OrderConfirmDialog, type OrderIntent } from "@/components/dashboard/order-confirm-dialog";
import { PriceAlertDialog, type AlertIntent } from "@/components/dashboard/price-alert-dialog";
import { Bell } from "lucide-react";
import { useCandles } from "@/hooks/use-candles";
import { useSignals, useGenerateSignals } from "@/hooks/use-signals";
import type { Ticker } from "@/hooks/use-ticker";
import { coinIdentity } from "@/lib/coins";
import { formatPrice, formatPercent, formatCompact, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TIMEFRAMES = ["1h", "4h", "1d"] as const;

export function CoinDetailDialog({
  ticker,
  onClose,
}: {
  ticker: Ticker | null;
  onClose: () => void;
}) {
  const [interval, setInterval] = React.useState<string>("1h");
  const [chartMode, setChartMode] = React.useState<ChartMode>("area");
  const [intent, setIntent] = React.useState<OrderIntent | null>(null);
  const [alertIntent, setAlertIntent] = React.useState<AlertIntent | null>(null);

  const symbol = ticker?.symbol ?? null;
  const exchange = ticker?.exchangeCode ?? "binance";
  // Trading, signals, and automations are Binance-scoped in v1; other exchanges
  // are market-data only.
  const isTradable = exchange === "binance";
  const { data: candles, isLoading } = useCandles(symbol, interval, 120, exchange);
  const { data: allSignals } = useSignals(50);
  const generate = useGenerateSignals();

  const id = ticker ? coinIdentity(ticker.symbol) : null;
  const change = ticker?.priceChangePercent24h ?? 0;
  // Some exchanges (Coinbase's batch feed) don't report 24h high/low — derive
  // them from the loaded candles so the stats aren't blank.
  const stats24h = React.useMemo(() => {
    const cs = candles ?? [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = cs.filter((c) => c.closeTime >= cutoff);
    const use = recent.length ? recent : cs;
    const high = ticker?.high24h && ticker.high24h > 0
      ? ticker.high24h
      : use.length ? Math.max(...use.map((c) => c.high)) : 0;
    const low = ticker?.low24h && ticker.low24h > 0
      ? ticker.low24h
      : use.length ? Math.min(...use.map((c) => c.low)) : 0;
    return { high, low };
  }, [candles, ticker]);
  const up = change >= 0;
  const signals = (allSignals ?? []).filter((s) => s.symbol === symbol).slice(0, 6);

  const scan = () => {
    if (!symbol) return;
    generate.mutate(
      { exchange: "binance", symbol, timeframe: interval as "1h" | "4h" | "1d" },
      {
        onSuccess: (d) => toast.success(`Generated ${d.signals?.length ?? 0} signals for ${id?.base}`),
        onError: (e) => toast.error(`Scan failed: ${(e as Error).message}`),
      }
    );
  };

  return (
    <>
      <Dialog open={ticker !== null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-xl p-0 gap-0 flex flex-col max-h-[85vh]">
          {ticker && id && (
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-border text-left space-y-0 shrink-0">
              {/* pr-8 reserves room for the dialog's close (X) button. */}
              <div className="flex items-center gap-3 pr-8">
                <CoinLogo base={id.base} size={40} />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base">
                    {id.name}{" "}
                    <span className="text-muted-foreground font-normal">
                      {id.base}
                      {id.quote && `/${id.quote}`}
                    </span>
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-lg font-bold tabular-nums">{formatPrice(ticker.price)}</span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {up ? "▲" : "▼"} {formatPercent(change)}
                    </span>
                  </div>
                </div>
                {isTradable && (
                  <button
                    type="button"
                    onClick={() => setAlertIntent({ symbol: ticker.symbol, price: ticker.price })}
                    aria-label="Set price alert"
                    title="Set price alert"
                    className="grid place-items-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Bell className="size-4" />
                  </button>
                )}
                <WatchStar symbol={ticker.symbol} size={20} />
              </div>
            </DialogHeader>
          )}

          {ticker && id && (
            <div className="overflow-y-auto px-5 py-4 scrollbar-terminal space-y-5">
              {/* Buy / Sell — Binance only in v1 */}
              {isTradable ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-600/90 text-white"
                    onClick={() => setIntent({ symbol: ticker.symbol, side: "buy", price: ticker.price, reason: "Manual buy" })}
                  >
                    Buy
                  </Button>
                  <Button
                    className="bg-rose-600 hover:bg-rose-600/90 text-white"
                    onClick={() => setIntent({ symbol: ticker.symbol, side: "sell", price: ticker.price, reason: "Manual sell" })}
                  >
                    Sell
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground text-center">
                  <span className="capitalize">{exchange}</span> is market-data only —
                  <span className="normal-case"> trading &amp; alerts are available on Binance.</span>
                </div>
              )}

              {/* Timeframe + chart */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  {/* Area / candlestick mode */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary">
                    <button
                      type="button"
                      onClick={() => setChartMode("area")}
                      aria-label="Line chart"
                      className={cn(
                        "grid place-items-center size-6 rounded transition-colors",
                        chartMode === "area" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <LineChartIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode("candles")}
                      aria-label="Candlestick chart"
                      className={cn(
                        "grid place-items-center size-6 rounded transition-colors",
                        chartMode === "candles" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <CandlestickIcon className="size-3.5" />
                    </button>
                  </div>
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
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full rounded-lg" />
                ) : (
                  <PriceChart candles={candles ?? []} height={220} mode={chartMode} />
                )}
              </div>

              {/* 24h stats */}
              <div className="grid grid-cols-3 gap-3">
                <Stat label="24h high" value={formatPrice(stats24h.high)} />
                <Stat label="24h low" value={formatPrice(stats24h.low)} />
                <Stat label="24h volume" value={`$${formatCompact(ticker.quoteVolume24h)}`} />
              </div>

              {/* Signals for this coin — Binance-scoped in v1 */}
              {isTradable && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Signals</div>
                  <Button size="sm" variant="outline" onClick={scan} disabled={generate.isPending} className="h-7 text-xs">
                    {generate.isPending ? "Scanning…" : `Scan ${id.base}`}
                  </Button>
                </div>
                {signals.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3">No signals yet — run a scan.</p>
                ) : (
                  <div className="space-y-1">
                    {signals.map((s) => {
                      const long = s.direction === "long";
                      const short = s.direction === "short";
                      return (
                        <div key={s.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border last:border-0">
                          <span className="px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{s.indicator}</span>
                          <span
                            className={cn(
                              "font-semibold uppercase",
                              long ? "text-emerald-600 dark:text-emerald-400" : short ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                            )}
                          >
                            {s.direction}
                          </span>
                          <span className="text-muted-foreground truncate flex-1">{s.note}</span>
                          <span className="text-muted-foreground/60 tabular-nums shrink-0">{timeAgo(s.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrderConfirmDialog intent={intent} onClose={() => setIntent(null)} />
      <PriceAlertDialog intent={alertIntent} onClose={() => setAlertIntent(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}
