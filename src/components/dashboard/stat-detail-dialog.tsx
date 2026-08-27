"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTickers } from "@/hooks/use-ticker";
import { useSignals } from "@/hooks/use-signals";
import { useAutomationRules } from "@/hooks/use-automation-rules";
import { CoinLogo } from "@/components/dashboard/coin-logo";
import { StatusDot } from "@/components/dashboard/status-dot";
import { coinIdentity } from "@/lib/coins";
import { formatUsd, formatPrice, formatPercent, timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export type StatMetric = "portfolio" | "change" | "signals" | "automations";

const TITLES: Record<StatMetric, { title: string; description: string }> = {
  portfolio: { title: "Portfolio", description: "Balances across connected exchanges" },
  change: { title: "Top movers · 24h", description: "Biggest gainers and losers by volume" },
  signals: { title: "Signals", description: "Latest intelligence across indicators" },
  automations: { title: "Automations", description: "Your configured rules" },
};

export function StatDetailDialog({
  metric,
  onClose,
}: {
  metric: StatMetric | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={metric !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        {metric && (
          <DialogHeader>
            <DialogTitle>{TITLES[metric].title}</DialogTitle>
            <DialogDescription>{TITLES[metric].description}</DialogDescription>
          </DialogHeader>
        )}
        {metric === "portfolio" && <PortfolioDetail />}
        {metric === "change" && <MoversDetail />}
        {metric === "signals" && <SignalsDetail />}
        {metric === "automations" && <AutomationsDetail />}
      </DialogContent>
    </Dialog>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function PortfolioDetail() {
  const { data, isLoading } = usePortfolio();
  if (isLoading) return <Empty>Loading…</Empty>;
  if (!data) return <Empty>Portfolio unavailable.</Empty>;

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-muted-foreground">Total balance · {data.quoteCurrency}</div>
        <div className="text-3xl font-bold tracking-tight tabular-nums mt-1">
          {formatUsd(data.totalValue)}
        </div>
      </div>

      {data.byExchange.length > 0 && (
        <section className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">By exchange</div>
          {data.byExchange.map((e) => (
            <div key={e.exchange.code} className="flex items-center justify-between text-sm py-1">
              <span className="font-medium">{e.exchange.name}</span>
              <span className="tabular-nums">{formatUsd(e.value)}</span>
            </div>
          ))}
        </section>
      )}

      {data.holdings.length > 0 && (
        <section className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Holdings</div>
          {data.holdings.map((h) => (
            <div key={`${h.exchangeCode}-${h.asset}`} className="flex items-center gap-2.5 text-sm py-1">
              <CoinLogo base={h.asset} size={24} />
              <span className="font-medium w-16 truncate">{h.asset}</span>
              <span className="flex-1 text-right text-muted-foreground tabular-nums text-xs">
                {h.quantity.toFixed(4)} @ {formatPrice(h.priceInQuote)}
              </span>
              <span className="tabular-nums font-medium w-24 text-right">{formatUsd(h.valueInQuote)}</span>
            </div>
          ))}
        </section>
      )}

      {data.unconfiguredExchanges.length > 0 && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/8 border border-amber-500/20 rounded-lg p-3">
          <span className="font-medium capitalize">{data.unconfiguredExchanges.join(", ")}</span> isn&apos;t
          connected. Add API credentials in <code>.env</code> to see your balances.
        </div>
      )}
    </div>
  );
}

function MoversDetail() {
  const { data: tickers } = useTickers("binance");
  const sorted = [...(tickers ?? [])].sort(
    (a, b) => (b.priceChangePercent24h ?? 0) - (a.priceChangePercent24h ?? 0)
  );
  if (sorted.length === 0) return <Empty>No market data.</Empty>;
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <div className="space-y-5">
      <MoverList title="Gainers" rows={gainers} />
      <MoverList title="Losers" rows={losers} />
    </div>
  );
}

function MoverList({ title, rows }: { title: string; rows: { symbol: string; price: number; priceChangePercent24h?: number }[] }) {
  return (
    <section className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {rows.map((t) => {
        const id = coinIdentity(t.symbol);
        const ch = t.priceChangePercent24h ?? 0;
        const up = ch >= 0;
        return (
          <div key={t.symbol} className="flex items-center gap-2.5 py-1">
            <CoinLogo base={id.base} size={24} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{id.name}</div>
              <div className="text-xs text-muted-foreground">
                {id.base}
                {id.quote && <span className="text-muted-foreground/60">/{id.quote}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums">{formatPrice(t.price)}</div>
              <div className={cn("text-xs font-semibold tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {formatPercent(ch)}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SignalsDetail() {
  const { data: signals } = useSignals(50);
  if (!signals || signals.length === 0) return <Empty>No signals yet. Run a scan from the Signals panel.</Empty>;
  return (
    <div className="space-y-1.5">
      {signals.map((s) => {
        const up = s.direction === "long";
        const down = s.direction === "short";
        return (
          <div key={s.id} className="flex items-start gap-2.5 py-1.5 border-b border-border last:border-0">
            <CoinLogo base={coinIdentity(s.symbol).base} size={22} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold">{s.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{s.indicator}</span>
                <span className={cn("text-[10px] font-semibold uppercase", up ? "text-emerald-600 dark:text-emerald-400" : down ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>{s.direction}</span>
                <span className="text-[10px] text-muted-foreground/60">{s.timeframe} · {timeAgo(s.createdAt)}</span>
              </div>
              {s.note && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.note}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-semibold tabular-nums">{formatPrice(s.price)}</div>
              <div className="text-[10px] text-muted-foreground tabular-nums">{(s.strength * 100).toFixed(0)}% conf</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AutomationsDetail() {
  const { data: rules } = useAutomationRules();
  if (!rules || rules.length === 0) return <Empty>No automation rules yet.</Empty>;
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <div key={r.id} className="flex items-start gap-2.5 py-1.5 border-b border-border last:border-0">
          <StatusDot color={r.enabled ? "emerald" : "slate"} pulse={r.enabled} size="md" className="mt-1" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{r.name}</div>
            <div className="text-xs text-muted-foreground">
              {r.description || `${r.trigger.conditions.length} condition(s) · ${r.action.type}`}
            </div>
            <div className="text-[10px] text-muted-foreground/60 tabular-nums mt-0.5">
              {r.trigger.exchange}:{r.trigger.symbol} · {r.trigger.timeframe} · last fired {r.lastFiredAt ? timeAgo(r.lastFiredAt) : "never"}
            </div>
          </div>
          <span className={cn("text-[10px] font-semibold uppercase shrink-0", r.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {r.enabled ? "Active" : "Paused"}
          </span>
        </div>
      ))}
    </div>
  );
}
