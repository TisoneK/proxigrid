"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Play, RefreshCw, ChevronDown } from "lucide-react";
import { useResearchStrategies, useRunLab, useTransitionStrategy, type ResearchStrategy } from "@/hooks/use-research";
import { nextStates, type StrategyStatus } from "@/lib/research/lifecycle/state-machine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Research Lab — the dashboard surface for the research engine. Shows the
 * strategy roster with lifecycle badges, a one-click lab run (grid candidates
 * through scientist → critic → one-shot OOS), and per-strategy experiment
 * history with guarded lifecycle transitions.
 */
export function ResearchLab() {
  const { data: strategies, isLoading } = useResearchStrategies();
  const runLab = useRunLab();
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const handleRun = () => {
    runLab.mutate(undefined, {
      onSuccess: (r) => {
        const regime = summarizeRegime(r.regimeDistribution);
        toast.success(
          `Lab run: ${r.candidates} candidates, ${r.survivors.length} survived OOS (${r.candles} ${r.candleSource === "history" ? "stored" : "live"} candles${regime ? `, ${regime}` : ""})`
        );
      },
      onError: (e) => toast.error(`Lab run failed: ${(e as Error).message}`),
    });
  };

  const living = (strategies ?? []).filter((s) => s.status !== "RETIRED" && s.code !== "PXG-000");

  return (
    <div className="card-premium lit-top relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Research Lab</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate → backtest → falsify → out-of-sample, once per spec
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRun}
          disabled={runLab.isPending}
          className="h-7 text-[11px] gap-1.5 border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-200"
        >
          <RefreshCw className={cn("h-3 w-3", runLab.isPending && "animate-spin")} />
          {runLab.isPending ? "Running…" : "Run lab"}
        </Button>
      </div>

      {/* Body */}
      <div className="p-2 flex-1">
        {isLoading ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : living.length === 0 ? (
          <EmptyLab onRun={handleRun} running={runLab.isPending} />
        ) : (
          <div className="space-y-1 max-h-[26rem] overflow-y-auto pr-1 scrollbar-terminal">
            {living.map((s) => (
              <StrategyRow
                key={s.id}
                strategy={s}
                expanded={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StrategyRow({
  strategy,
  expanded,
  onToggle,
}: {
  strategy: ResearchStrategy;
  expanded: boolean;
  onToggle: () => void;
}) {
  const transition = useTransitionStrategy();
  const latest = strategy.experiments[0];
  const oos = [...strategy.experiments].reverse().find((e) => e.kind === "oos");

  const handleTransition = (to: StrategyStatus) => {
    transition.mutate(
      { id: strategy.id, to },
      {
        onSuccess: () => toast.success(`${strategy.code} → ${to}`),
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <div className="rounded-md border border-border bg-transparent hover:bg-accent/40 transition-colors">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-2.5 px-3 py-2 text-left">
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !expanded && "-rotate-90")} />
        <span className="text-xs font-mono font-semibold text-foreground w-16 shrink-0">{strategy.code}</span>
        <StatusBadge status={strategy.status} />
        <span className="flex-1 min-w-0 truncate text-[11px] text-muted-foreground">{strategy.hypothesis}</span>
        {oos && (
          <span
            className={cn(
              "text-[10px] font-semibold tabular-nums shrink-0",
              (oos.metrics.totalReturnPct ?? 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            OOS {(oos.metrics.totalReturnPct ?? 0) >= 0 ? "+" : ""}
            {(oos.metrics.totalReturnPct ?? 0).toFixed(1)}%
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
          {strategy.experiments.length} exp
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/60">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>assets: <span className="text-foreground font-medium">{strategy.assets.join(", ") || "—"}</span></span>
            <span>timeframe: <span className="text-foreground font-medium">{strategy.timeframe}</span></span>
            <span>allocation: <span className="text-foreground font-medium tabular-nums">{(strategy.allocation * 100).toFixed(0)}%</span></span>
            {strategy.regime && <span>regime: <span className="text-foreground font-medium">{strategy.regime}</span></span>}
          </div>

          {latest && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                {strategy.experiments.slice(0, 6).reverse().map((e) => (
                  <span
                    key={e.id}
                    title={`${e.kind} · ${new Date(e.createdAt).toLocaleString()} · ${e.passed ? "passed" : "failed"}`}
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 h-4 inline-flex items-center rounded-full",
                      e.kind === "oos"
                        ? e.passed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : e.kind === "monitor"
                        ? e.passed
                          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {e.kind}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <Metric label="Trades" value={String(latest.metrics.trades ?? "—")} />
                <Metric label="Win rate" value={latest.metrics.winRate != null ? `${(latest.metrics.winRate * 100).toFixed(0)}%` : "—"} />
                <Metric label="Sharpe" value={latest.metrics.sharpe != null ? latest.metrics.sharpe.toFixed(2) : "—"} />
                <Metric label="Max DD" value={latest.metrics.maxDrawdownPct != null ? `${latest.metrics.maxDrawdownPct.toFixed(1)}%` : "—"} />
              </div>
            </div>
          )}

          {latest?.criticReport?.checks && latest.criticReport.checks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {latest.criticReport.checks.map((c) => (
                <span
                  key={c.name}
                  title={c.detail}
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 inline-flex items-center rounded-full",
                    c.passed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}

          {nextStates(strategy.status as StrategyStatus).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground">Transition:</span>
              {nextStates(strategy.status as StrategyStatus).map((to) => (
                <Button
                  key={to}
                  size="sm"
                  variant="outline"
                  disabled={transition.isPending}
                  onClick={() => handleTransition(to)}
                  className="h-5 px-1.5 text-[10px]"
                >
                  {to}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  RESEARCH: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  HYPOTHESIS: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  BACKTESTING: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  VALIDATION: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  PAPER: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  LIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  MONITORING: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  DEGRADING: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  RETIRED: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0 h-4 inline-flex items-center rounded-full border shrink-0",
        STATUS_STYLES[status] ?? STATUS_STYLES.RESEARCH
      )}
    >
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/** Dominant regime over the run window, e.g. "66% LOW_VOL" (null if unknown). */
function summarizeRegime(dist?: Record<string, number>): string | null {
  if (!dist) return null;
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const [top, count] = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  return `${Math.round((count / total) * 100)}% ${top}`;
}

function EmptyLab({ onRun, running }: { onRun: () => void; running: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary">
        <Play className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No strategies yet</p>
      <p className="mt-1 text-xs text-muted-foreground/70 max-w-[22rem]">
        Run the lab: it sweeps a parameter grid through the scientist, the critic&apos;s falsification checks, and a
        one-shot out-of-sample window. Survivors earn a PXG-### code.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRun}
        disabled={running}
        className="mt-4 h-7 text-[11px] gap-1.5 border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-200"
      >
        <RefreshCw className={cn("h-3 w-3", running && "animate-spin")} />
        {running ? "Running…" : "Run the lab"}
      </Button>
    </div>
  );
}
