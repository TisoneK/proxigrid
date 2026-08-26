"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSignals, useGenerateSignals } from "@/hooks/use-signals";
import { formatPrice, timeAgo } from "@/lib/utils/format";
import { Brain, RefreshCw, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function SignalsFeed() {
  const { data: signals, isLoading } = useSignals(50);
  const generate = useGenerateSignals();

  const handleGenerate = () => {
    generate.mutate(
      { exchange: "binance", symbol: "BTCUSDT", timeframe: "1h" },
      {
        onSuccess: (data) => {
          toast.success(`Generated ${data.signals?.length ?? 0} signals for BTCUSDT`);
        },
        onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
      }
    );
  };

  return (
    <div className="card-premium lit-top relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <Brain className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Intelligence
            </div>
            <div className="text-sm font-semibold text-foreground">
              Signals Feed
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="h-7 text-[11px] gap-1.5 border-emerald-500/25 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
        >
          <RefreshCw className={cn("h-3 w-3", generate.isPending && "animate-spin")} />
          Scan BTC
        </Button>
      </div>

      {/* Body */}
      <div className="p-3 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : signals && signals.length > 0 ? (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1 scrollbar-terminal">
            {signals.map((s, idx) => {
              const dir =
                s.direction === "long"
                  ? "up"
                  : s.direction === "short"
                  ? "down"
                  : "neutral";
              const dirColor =
                dir === "up"
                  ? "border-l-emerald-400"
                  : dir === "down"
                  ? "border-l-rose-400"
                  : "border-l-slate-500";
              const dirIcon =
                dir === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : dir === "down" ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : null;
              const dirText =
                dir === "up"
                  ? "text-emerald-300"
                  : dir === "down"
                  ? "text-rose-300"
                  : "text-slate-300";
              return (
                <div
                  key={s.id}
                  className={cn(
                    "group relative flex items-start gap-3 rounded-md border border-border/40 border-l-2 bg-card/30 px-3 py-2.5",
                    "hover:bg-accent/40 transition-colors",
                    dirColor,
                    "animate-slide-in-top"
                  )}
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold tracking-tight text-foreground">
                        {s.symbol}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono px-1.5 py-0 h-4 bg-card/60 border-border/60 text-muted-foreground"
                      >
                        {s.indicator}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 h-4 inline-flex items-center gap-0.5",
                          dir === "up"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                            : dir === "down"
                            ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                            : "bg-slate-500/10 text-slate-300 border-slate-500/20"
                        )}
                      >
                        {dirIcon}
                        {s.direction}
                      </Badge>
                      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60">
                        {s.timeframe} · {timeAgo(s.createdAt)}
                      </span>
                    </div>
                    {s.note && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate font-mono">
                        {s.note}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono text-xs font-semibold tabular-nums text-foreground">
                      {formatPrice(s.price)}
                    </div>
                    <div className={cn("text-[10px] font-semibold tabular-nums", dirText)}>
                      {(s.strength * 100).toFixed(0)}% conf
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptySignals onScan={handleGenerate} scanning={generate.isPending} />
        )}
      </div>
    </div>
  );
}

function EmptySignals({
  onScan,
  scanning,
}: {
  onScan: () => void;
  scanning: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-xl rounded-full" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25">
          <Activity className="h-5 w-5 text-emerald-300" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No signals yet</p>
      <p className="mt-1 text-xs text-muted-foreground/70 max-w-[20rem]">
        Run an intelligence scan to generate signals from RSI, MACD, EMA &amp; Bollinger indicators.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onScan}
        disabled={scanning}
        className="mt-4 h-7 text-[11px] gap-1.5 border-emerald-500/25 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
      >
        <RefreshCw className={cn("h-3 w-3", scanning && "animate-spin")} />
        Scan BTC now
      </Button>
    </div>
  );
}
