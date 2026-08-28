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
import { PriceChart } from "@/components/dashboard/price-chart";
import { OrderConfirmDialog, type OrderIntent } from "@/components/dashboard/order-confirm-dialog";
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
  const [intent, setIntent] = React.useState<OrderIntent | null>(null);

  const symbol = ticker?.symbol ?? null;
  const { data: candles, isLoading } = useCandles(symbol, interval, 120);
  const { data: allSignals } = useSignals(50);
  const generate = useGenerateSignals();

  const id = ticker ? coinIdentity(ticker.symbol) : null;
  const change = ticker?.priceChangePercent24h ?? 0;
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
                <WatchStar symbol={ticker.symbol} size={20} />
              </div>
            </DialogHeader>
          )}

          {ticker && id && (
            <div className="overflow-y-auto px-5 py-4 scrollbar-terminal space-y-5">
              {/* Buy / Sell */}
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

              {/* Timeframe + chart */}
              <div>
                <div className="flex items-center justify-end gap-1 mb-2">
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
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full rounded-lg" />
                ) : (
                  <PriceChart candles={candles ?? []} height={220} />
                )}
              </div>

              {/* 24h stats */}
              <div className="grid grid-cols-3 gap-3">
                <Stat label="24h high" value={formatPrice(ticker.high24h ?? 0)} />
                <Stat label="24h low" value={formatPrice(ticker.low24h ?? 0)} />
                <Stat label="24h volume" value={`$${formatCompact(ticker.quoteVolume24h)}`} />
              </div>

              {/* Signals for this coin */}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrderConfirmDialog intent={intent} onClose={() => setIntent(null)} />
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
