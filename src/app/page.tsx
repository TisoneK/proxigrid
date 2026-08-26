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
    // ROOT: h-screen + overflow-hidden. The root NEVER scrolls — only the
    // body container below scrolls. This means the header & KPI bar are
    // structurally incapable of being overlapped: they live in a separate
    // flex region above the scroll container.
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* FIXED TOP REGION: header + KPI bar. Never scrolls. */}
      <Header />

      {/* KPI bar — static (not sticky, because the parent never scrolls) */}
      <div className="flex-none border-b border-border/60 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/40">
            <StatCard
              label="Portfolio Value"
              value={totalValue}
              valueLabel={formatCurrency(totalValue)}
              prefix="$"
              decimals={2}
              format={(n) => formatCurrency(n)}
              sublabel="All exchanges"
              icon={<Wallet />}
              accent="emerald"
            />
            <StatCard
              label="Avg 24h Change"
              value={avgChange}
              valueLabel={`${avgChange.toFixed(2)}%`}
              suffix="%"
              decimals={2}
              trend={avgChange}
              sublabel="Top 5 by volume"
              icon={<Activity />}
              accent={avgChange >= 0 ? "emerald" : "amber"}
            />
            <StatCard
              label="Active Signals"
              value={signalCount}
              valueLabel={String(signalCount)}
              decimals={0}
              sublabel="RSI · MACD · EMA · BB"
              icon={<Brain />}
              accent="teal"
            />
            <StatCard
              label="Active Rules"
              value={activeRuleCount}
              valueLabel={`${activeRuleCount} / ${totalRuleCount}`}
              decimals={0}
              sublabel={`${totalRuleCount} configured`}
              icon={<Zap />}
              accent="slate"
            />
          </div>
        </div>
      </div>

      {/* BODY — independent scroll container. Physically cannot scroll
          into the header/KPI region because they live in a separate
          flex-none sibling. Content stays inside this box forever. */}
      <main className="flex-1 overflow-y-auto scrollbar-terminal">
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Hero grid: portfolio + markets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 animate-fade-up" style={{ animationDelay: "60ms" }}>
              <PortfolioCard />
            </div>
            <div className="lg:col-span-2 animate-fade-up" style={{ animationDelay: "120ms" }}>
              <MarketGrid />
            </div>
          </div>

          {/* Bottom: signals + automation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
              <SignalsFeed />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
              <AutomationRulesTable />
            </div>
          </div>
        </div>

        {/* Footer (inside the scroll container so it stays at the natural end) */}
        <footer className="border-t border-border/60 bg-background/80 mt-6">
          <div className="container mx-auto px-4 sm:px-6 py-4 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono">
              <span className="text-brand-gradient font-semibold">Proxigrid</span>
              <span className="text-muted-foreground/60"> v0.1.0 — base codebase</span>
            </span>
            <span className="font-mono">
              <a
                href="https://github.com/TisoneK/proxigrid"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-300 underline-offset-2 hover:underline transition-colors"
              >
                github.com/TisoneK/proxigrid
              </a>
            </span>
          </div>
        </footer>
      </main>
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
