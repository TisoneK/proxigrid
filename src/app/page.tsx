"use client";

import { PortfolioCard } from "@/components/dashboard/portfolio-card";
import { MarketGrid } from "@/components/dashboard/market-grid";
import { SignalsFeed } from "@/components/dashboard/signals-feed";
import { AutomationRulesTable } from "@/components/dashboard/automation-rules-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { Header } from "@/components/dashboard/header";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTickers } from "@/hooks/use-ticker";
import { useSignals } from "@/hooks/use-signals";
import { useAutomationRules } from "@/hooks/use-automation-rules";
import { Activity, Brain, Zap, Wallet } from "lucide-react";

export default function Home() {
  const { data: portfolio } = usePortfolio();
  const { data: tickers } = useTickers("binance");
  const { data: signals } = useSignals(50);
  const { data: rules } = useAutomationRules();

  const totalValue = portfolio?.totalValue ?? 0;
  const signalCount = signals?.length ?? 0;
  const activeRuleCount = rules?.filter((r) => r.enabled).length ?? 0;
  const totalRuleCount = rules?.length ?? 0;

  const topChanges = (tickers ?? [])
    .map((t) => t.priceChangePercent24h ?? 0)
    .slice(0, 5);
  const avgChange =
    topChanges.length > 0
      ? topChanges.reduce((a, b) => a + b, 0) / topChanges.length
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar — the page scrolls naturally beneath it. */}
      <div className="sticky top-0 z-30">
        <Header />
      </div>

      <main className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
          <StatCard
            label="Portfolio value"
            value={totalValue}
            valueLabel={formatCurrency(totalValue)}
            prefix="$"
            decimals={2}
            format={(n) => formatCurrency(n)}
            sublabel="Across all exchanges"
            icon={<Wallet />}
            accent="emerald"
          />
          <StatCard
            label="Avg 24h change"
            value={avgChange}
            valueLabel={`${avgChange.toFixed(2)}%`}
            suffix="%"
            decimals={2}
            trend={avgChange}
            sublabel="Top 5 markets by volume"
            icon={<Activity />}
            accent={avgChange >= 0 ? "emerald" : "amber"}
          />
          <StatCard
            label="Active signals"
            value={signalCount}
            valueLabel={String(signalCount)}
            decimals={0}
            sublabel="RSI · MACD · EMA · Bollinger"
            icon={<Brain />}
            accent="teal"
          />
          <StatCard
            label="Automations"
            value={activeRuleCount}
            valueLabel={`${activeRuleCount} / ${totalRuleCount}`}
            decimals={0}
            sublabel={`${totalRuleCount} configured`}
            icon={<Zap />}
            accent="slate"
          />
        </div>

        {/* Hero: portfolio + markets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <PortfolioCard />
          </div>
          <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <MarketGrid />
          </div>
        </div>

        {/* Signals + automation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <SignalsFeed />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
            <AutomationRulesTable />
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-6">
        <div className="container mx-auto px-4 sm:px-6 py-5 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <span>
            <span className="text-brand-gradient font-semibold">Proxigrid</span>
            <span className="text-muted-foreground"> · Crypto markets &amp; automation</span>
          </span>
          <a
            href="https://github.com/TisoneK/proxigrid"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            github.com/TisoneK/proxigrid
          </a>
        </div>
      </footer>
    </div>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
