"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { useSignals } from "@/hooks/use-signals";
import { useExecutions } from "@/hooks/use-executions";
import { useTickers, type Ticker } from "@/hooks/use-ticker";
import { CoinDetailDialog } from "@/components/dashboard/coin-detail-dialog";
import { coinIdentity } from "@/lib/coins";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface NotifItem {
  id: string;
  kind: "execution" | "signal";
  title: string;
  desc: string;
  time: number;
  up?: boolean;
  symbol?: string;
  price?: number;
}

const SEEN_KEY = "proxigrid:notif-seen";

/** Bell with a history of rule fires + strong signals, and an unread badge. */
export function NotificationBell() {
  const { data: signals } = useSignals(30);
  const { data: execs } = useExecutions(30);
  const { data: tickers } = useTickers("binance");
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Ticker | null>(null);
  const [lastSeen, setLastSeen] = React.useState<number>(() => {
    try {
      return Number(localStorage.getItem(SEEN_KEY) ?? 0);
    } catch {
      return 0;
    }
  });

  const items: NotifItem[] = React.useMemo(() => {
    const out: NotifItem[] = [];
    for (const e of execs ?? []) {
      out.push({
        id: `e-${e.id}`,
        kind: "execution",
        title: `Rule fired: ${e.rule?.name ?? "automation"}`,
        desc: e.actionResult?.detail ?? e.triggerSnapshot?.notes?.join(", ") ?? "",
        time: new Date(e.firedAt).getTime(),
        symbol: e.triggerSnapshot?.ctx?.symbol,
        price: e.triggerSnapshot?.ctx?.price,
      });
    }
    for (const s of signals ?? []) {
      if ((s.direction !== "long" && s.direction !== "short") || s.strength < 0.5) continue;
      const id = coinIdentity(s.symbol);
      out.push({
        id: `s-${s.id}`,
        kind: "signal",
        title: `${id.name}: ${s.direction === "long" ? "Buy" : "Sell"} signal`,
        desc: `${s.indicator} · ${(s.strength * 100).toFixed(0)}% confidence`,
        time: new Date(s.createdAt).getTime(),
        up: s.direction === "long",
        symbol: s.symbol,
        price: s.price,
      });
    }
    return out.sort((a, b) => b.time - a.time).slice(0, 30);
  }, [signals, execs]);

  const unread = items.filter((i) => i.time > lastSeen).length;

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      const now = Date.now();
      setLastSeen(now);
      try {
        localStorage.setItem(SEEN_KEY, String(now));
      } catch {
        /* ignore */
      }
    }
  };

  const openDetail = (item: NotifItem) => {
    if (!item.symbol) return;
    setOpen(false);
    const live = (tickers ?? []).find((t) => t.symbol === item.symbol);
    setDetail(
      live ?? {
        exchangeCode: "binance",
        symbol: item.symbol,
        price: item.price ?? 0,
        timestamp: item.time,
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto scrollbar-terminal">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet. Signals and rule fires show up here.
            </p>
          ) : (
            items.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => openDetail(i)}
                disabled={!i.symbol}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 border-b border-border last:border-0 text-left hover:bg-secondary/50 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    i.kind === "execution"
                      ? "text-primary"
                      : i.up
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {i.kind === "execution" ? (
                    <Zap className="h-4 w-4" />
                  ) : i.up ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{i.title}</div>
                  {i.desc && <div className="text-[11px] text-muted-foreground truncate">{i.desc}</div>}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                  {timeAgo(i.time)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
      <CoinDetailDialog ticker={detail} onClose={() => setDetail(null)} />
    </Popover>
  );
}
