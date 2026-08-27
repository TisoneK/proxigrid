"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTickers } from "@/hooks/use-ticker";
import { formatPrice, formatPercent } from "@/lib/utils/format";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Sparkline, synthesizeSeries } from "@/components/dashboard/sparkline";
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
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Markets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Top by 24h volume · Binance</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            showEmpty
              ? "bg-rose-500/12 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
          )}
        >
          <StatusDot color={showEmpty ? "rose" : "emerald"} pulse={!showEmpty} size="sm" />
          {showEmpty ? "Offline" : "Live"}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 flex-1 min-h-0">
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 max-h-[26rem] overflow-y-auto pr-1 scrollbar-terminal">
            {(tickers ?? []).slice(0, 12).map((t) => {
              const id = coinIdentity(t.symbol);
              const change = t.priceChangePercent24h ?? 0;
              const up = change >= 0;
              const series = synthesizeSeries(t.symbol, t.price, change, 20);
              return (
                <div
                  key={t.symbol}
                  className="group flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-secondary/60"
                >
                  <CoinAvatar base={id.base} size={38} />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {id.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {id.base}
                      {id.quote && <span className="text-muted-foreground/60"> / {id.quote}</span>}
                    </div>
                  </div>

                  <div className="hidden sm:block opacity-80 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={series} width={64} height={30} ariaLabel={`${id.name} trend`} />
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {formatPrice(t.price)}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-semibold tabular-nums mt-0.5",
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
