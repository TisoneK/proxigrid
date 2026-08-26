"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatPrice, formatUsd } from "@/lib/utils/format";
import { CountUp } from "@/components/dashboard/count-up";
import { StatusDot } from "@/components/dashboard/status-dot";
import { Wallet, AlertCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function PortfolioCard() {
  const { data, isLoading, isError } = usePortfolio();

  if (isLoading) {
    return (
      <div className="card-premium lit-top relative overflow-hidden p-0">
        <div className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-9 w-44 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-5 pt-0 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-premium lit-top relative overflow-hidden border-rose-500/30 p-5">
        <div className="flex items-center gap-2 text-rose-300">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Portfolio Unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Add API credentials to <code className="font-mono text-emerald-300">.env</code> to enable.
        </p>
      </div>
    );
  }

  const totalExchanges = data.byExchange.length;
  const totalHoldings = data.holdings.length;
  const hasValue = data.totalValue > 0;

  return (
    <div className="card-premium lit-top relative overflow-hidden">
      {/* Hero gradient header */}
      <div className="relative p-5 sm:p-6 overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 opacity-90",
            hasValue
              ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/8 to-transparent"
              : "bg-gradient-to-br from-slate-500/10 to-transparent"
          )}
        />
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-500/25">
                <Wallet className="h-3.5 w-3.5 text-emerald-300" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Portfolio
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/8 border border-emerald-500/20">
              <StatusDot color="emerald" pulse size="sm" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Synced
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">
              Total · {data.quoteCurrency}
            </span>
          </div>
          <div
            className="font-mono text-3xl sm:text-[34px] leading-none font-bold tracking-tight mt-1.5 text-foreground"
            aria-label={formatUsd(data.totalValue)}
          >
            <CountUp
              value={data.totalValue}
              prefix="$"
              decimals={2}
              format={(n) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(n)
              }
            />
          </div>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span className="font-mono tabular-nums">
                {totalExchanges} exchange{totalExchanges !== 1 ? "s" : ""}
              </span>
            </span>
            <span className="text-border">·</span>
            <span className="font-mono tabular-nums">
              {totalHoldings} asset{totalHoldings !== 1 ? "s" : ""}
            </span>
            <span className="text-border">·</span>
            <span className="uppercase tracking-wider">{data.quoteCurrency}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 pt-0 space-y-5">
        {data.byExchange.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
              By Exchange
            </div>
            <div className="space-y-1">
              {data.byExchange.map((e) => (
                <div
                  key={e.exchange.code}
                  className="group flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-foreground/90 truncate">
                      {e.exchange.name}
                    </span>
                    {e.exchange.isPaper && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider font-semibold">
                        testnet
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-foreground/90">
                    {formatUsd(e.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.holdings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                Top Holdings
              </div>
              <div className="text-[10px] text-muted-foreground/50">qty · price · value</div>
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 scrollbar-terminal">
              {data.holdings.slice(0, 8).map((h) => (
                <div
                  key={`${h.exchangeCode}-${h.asset}`}
                  className="group flex items-center justify-between text-xs py-1.5 px-2 -mx-2 rounded-md hover:bg-accent/40 transition-colors"
                >
                  <span className="font-semibold text-foreground/90 w-12 truncate">
                    {h.asset}
                  </span>
                  <span className="text-muted-foreground font-mono tabular-nums text-[11px] flex-1 text-right pr-3 truncate">
                    {h.quantity.toFixed(4)}
                    <span className="text-muted-foreground/50"> @ </span>
                    {formatPrice(h.priceInQuote)}
                  </span>
                  <span className="font-mono tabular-nums text-foreground/90 font-medium">
                    {formatUsd(h.valueInQuote)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.unconfiguredExchanges.length > 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/15 rounded-md p-2.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">
              Unconfigured: <span className="font-mono">{data.unconfiguredExchanges.join(", ")}</span>. Add credentials in <code className="font-mono">.env</code> to enable.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
