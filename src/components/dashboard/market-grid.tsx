"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTickers } from "@/hooks/use-ticker";
import { formatPrice, formatPercent, formatCompact } from "@/lib/utils/format";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { MarketSparkline } from "@/components/dashboard/market-sparkline";
import { StatusDot } from "@/components/dashboard/status-dot";
import { CoinAvatar } from "@/components/dashboard/coin-avatar";
import { coinIdentity } from "@/lib/coins";
import { cn } from "@/lib/utils";

export function MarketGrid() {
  const { data: tickers, isLoading, isError, error, refetch, isFetching } =
    useTickers("binance");
  const hasData = (tickers?.length ?? 0) > 0;
  const isBusy = isLoading || isFetching;
  const showEmpty = !hasData && !isBusy;

  return (
    <div className="card-premium lit-top h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Markets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Top by 24h volume · Binance</p>
        </div>
        {showEmpty && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/12 text-rose-600 dark:text-rose-400">
            <StatusDot color="rose" size="sm" />
            Offline
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex-1 min-h-0">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
              <AlertTriangle className="h-6 w-6 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                {isError ? "Couldn't load market data" : "No market data available"}
              </div>
              <div className="max-w-sm text-xs text-muted-foreground">
                {isError && error instanceof Error
                  ? error.message
                  : "The market feed returned no symbols. Try again in a moment."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[44px] my-0.5 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 max-h-[28rem] overflow-y-auto scrollbar-terminal">
            {(tickers ?? []).slice(0, 16).map((t) => {
              const id = coinIdentity(t.symbol);
              const change = t.priceChangePercent24h ?? 0;
              const up = change >= 0;
              return (
                <div
                  key={t.symbol}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/70"
                >
                  <CoinAvatar base={id.base} size={28} />

                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-foreground truncate leading-tight">
                      {id.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      {id.base}
                      {id.quote && <span className="text-muted-foreground/60">/{id.quote}</span>}
                    </div>
                  </div>

                  <div className="hidden lg:block text-right shrink-0 w-14 tabular-nums">
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      ${formatCompact(t.quoteVolume24h)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground/60 leading-tight">
                      vol
                    </div>
                  </div>

                  <div className="hidden sm:block opacity-70 group-hover:opacity-100 transition-opacity">
                    <MarketSparkline symbol={t.symbol} width={54} height={24} />
                  </div>

                  <div className="text-right shrink-0 w-[88px]">
                    <div className="text-[13px] font-semibold text-foreground tabular-nums leading-tight">
                      {formatPrice(t.price)}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] font-semibold tabular-nums leading-tight",
                        up
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {up ? "▲" : "▼"} {formatPercent(change)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
