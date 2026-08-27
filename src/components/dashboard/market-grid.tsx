"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTickers } from "@/hooks/use-ticker";
import { formatPrice, formatPercent } from "@/lib/utils/format";
import { Activity, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Sparkline, synthesizeSeries } from "@/components/dashboard/sparkline";
import { StatusDot } from "@/components/dashboard/status-dot";
import { cn } from "@/lib/utils";

export function MarketGrid() {
  const { data: tickers, isLoading, isError, error, refetch, isFetching } =
    useTickers("binance");
  const hasData = (tickers?.length ?? 0) > 0;
  const isBusy = isLoading || isFetching;
  // Show the empty/error panel whenever we've settled with nothing to display —
  // covers both a failed fetch and a genuinely empty response. If a refetch
  // fails while we still hold data, we keep rendering the data instead.
  const showEmpty = !hasData && !isBusy;

  return (
    <div className="card-premium lit-top relative overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Markets
            </div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              Binance
              <span className="text-[10px] font-normal text-muted-foreground/60 uppercase tracking-wider">
                · top by volume
              </span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
            showEmpty
              ? "bg-rose-500/8 border-rose-500/20"
              : "bg-emerald-500/8 border-emerald-500/20"
          )}
        >
          <StatusDot color={showEmpty ? "rose" : "emerald"} pulse={!showEmpty} size="sm" />
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider",
              showEmpty ? "text-rose-300" : "text-emerald-300"
            )}
          >
            {showEmpty ? "Offline" : "Streaming"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
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
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-border disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[28rem] overflow-y-auto pr-1 scrollbar-terminal">
            {(tickers ?? []).slice(0, 12).map((t) => {
              const change = t.priceChangePercent24h ?? 0;
              const up = change >= 0;
              const series = synthesizeSeries(
                t.symbol,
                t.price,
                change,
                20
              );
              return (
                <div
                  key={t.symbol}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg p-3 transition-all duration-150 cursor-default",
                    "border border-border/40 hover:border-border",
                    up ? "hover:tint-up" : "hover:tint-down",
                    "hover:-translate-y-px"
                  )}
                >
                  {/* Symbol + price */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold tracking-tight text-foreground truncate">
                        {t.symbol}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-emerald-300 transition-colors" />
                    </div>
                    <div className="font-mono text-[15px] font-semibold tabular-nums tracking-tight mt-0.5 text-foreground">
                      {formatPrice(t.price)}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] font-semibold tabular-nums mt-0.5",
                        up ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {up ? "▲" : "▼"} {formatPercent(change)}
                    </div>
                  </div>

                  {/* Sparkline */}
                  <div className="flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Sparkline
                      data={series}
                      width={70}
                      height={36}
                      ariaLabel={`${t.symbol} sparkline`}
                    />
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
