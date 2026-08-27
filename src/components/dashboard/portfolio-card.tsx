"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatPrice, formatUsd } from "@/lib/utils/format";
import { CountUp } from "@/components/dashboard/count-up";
import { CoinAvatar } from "@/components/dashboard/coin-avatar";
import { Wallet, AlertCircle } from "lucide-react";

export function PortfolioCard() {
  const { data, isLoading, isError } = usePortfolio();

  if (isLoading) {
    return (
      <div className="card-premium lit-top p-5 sm:p-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-9 w-44 mb-2" />
        <Skeleton className="h-3 w-32 mb-6" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card-premium lit-top p-5 sm:p-6 border-rose-500/30">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Portfolio unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Add API credentials to <code>.env</code> to enable.
        </p>
      </div>
    );
  }

  const totalExchanges = data.byExchange.length;
  const totalHoldings = data.holdings.length;

  return (
    <div className="card-premium lit-top h-full flex flex-col overflow-hidden">
      {/* Hero */}
      <div className="p-5 sm:p-6 border-b border-border">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
            <Wallet className="h-[18px] w-[18px]" />
          </div>
          <span className="text-sm font-semibold text-foreground">Portfolio</span>
        </div>

        <div className="text-xs text-muted-foreground">Total balance · {data.quoteCurrency}</div>
        <div
          className="text-3xl sm:text-[34px] leading-none font-bold tracking-tight mt-1.5 text-foreground tabular-nums"
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

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <span>{totalExchanges} exchange{totalExchanges !== 1 ? "s" : ""}</span>
          <span className="text-border">·</span>
          <span>{totalHoldings} asset{totalHoldings !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-5 flex-1">
        {data.byExchange.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">By exchange</div>
            {data.byExchange.map((e) => (
              <div
                key={e.exchange.code}
                className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground truncate">{e.exchange.name}</span>
                  {e.exchange.isPaper && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400 font-medium">
                      testnet
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-foreground font-medium">{formatUsd(e.value)}</span>
              </div>
            ))}
          </div>
        )}

        {data.holdings.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Top holdings</div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1 scrollbar-terminal">
              {data.holdings.slice(0, 8).map((h) => (
                <div
                  key={`${h.exchangeCode}-${h.asset}`}
                  className="flex items-center gap-2.5 text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <CoinAvatar base={h.asset} size={28} />
                  <span className="font-medium text-foreground w-14 truncate">{h.asset}</span>
                  <span className="text-muted-foreground tabular-nums text-xs flex-1 text-right pr-3 truncate">
                    {h.quantity.toFixed(4)}
                    <span className="text-muted-foreground/60"> @ </span>
                    {formatPrice(h.priceInQuote)}
                  </span>
                  <span className="tabular-nums text-foreground font-medium">{formatUsd(h.valueInQuote)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.unconfiguredExchanges.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">
              <span className="font-medium capitalize">{data.unconfiguredExchanges.join(", ")}</span> isn&apos;t
              connected yet. Add API credentials in <code>.env</code> to see your balances.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
