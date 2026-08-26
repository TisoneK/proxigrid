"use client";

import * as React from "react";
import { CountUp } from "@/components/dashboard/count-up";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  /** Animated numeric value (will count up). */
  value: number;
  /** Render string for accessibility / no-JS fallback. */
  valueLabel: string;
  /** Optional count-up formatter override. */
  format?: (n: number) => string;
  /** Decimal places for count-up. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sublabel?: string;
  /** Optional trend percentage to show as colored chip. */
  trend?: number;
  icon?: React.ReactNode;
  /** Accent — emerald (default) is the brand. */
  accent?: "emerald" | "teal" | "amber" | "slate";
  className?: string;
}

const accentMap: Record<
  NonNullable<StatCardProps["accent"]>,
  { text: string; iconBg: string; ring: string }
> = {
  emerald: {
    text: "text-emerald-300",
    iconBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    ring: "before:from-emerald-400/50",
  },
  teal: {
    text: "text-teal-300",
    iconBg: "bg-teal-500/10 text-teal-300 border-teal-500/20",
    ring: "before:from-teal-400/50",
  },
  amber: {
    text: "text-amber-300",
    iconBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    ring: "before:from-amber-400/50",
  },
  slate: {
    text: "text-slate-300",
    iconBg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    ring: "before:from-slate-300/30",
  },
};

/**
 * Compact horizontal KPI bar — Bloomberg/Linear style.
 * One row: [icon] LABEL · SUB  →  VALUE + trend chip
 * Target height: ~56–64px so the whole 4-card KPI row stays under ~80px tall.
 */
export function StatCard({
  label,
  value,
  valueLabel,
  format,
  decimals = 0,
  prefix,
  suffix,
  sublabel,
  trend,
  icon,
  accent = "emerald",
  className,
}: StatCardProps) {
  const a = accentMap[accent];
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn(
        // Compact padding: px-3 py-2.5 keeps card around 56–64px tall
        "group relative px-3 py-2.5 sm:px-4 sm:py-3 overflow-hidden",
        // Top accent hairline (1px) — only visible cue, no heavy orbs
        "before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:to-transparent",
        a.ring,
        "transition-colors duration-150 hover:bg-accent/30",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Compact icon — 24px square */}
        {icon && (
          <div
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border",
              a.iconBg
            )}
          >
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          </div>
        )}

        {/* Label + sublabel stacked compactly */}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80 leading-tight truncate">
            {label}
          </div>
          {sublabel && (
            <div className="text-[10px] text-muted-foreground/60 leading-tight truncate mt-0.5">
              {sublabel}
            </div>
          )}
        </div>

        {/* Value + trend inline on the right.
            If `suffix` is already set (e.g. "%"), the trend value is encoded
            in the big number itself — so we just color the number instead of
            showing a redundant trend chip. Otherwise, show the chip. */}
        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-mono text-base sm:text-lg leading-none font-semibold tracking-tight tabular-nums",
              // When suffix carries the unit (e.g. "%"), color the number by trend direction
              suffix && trend !== undefined
                ? trendUp
                  ? "text-emerald-300"
                  : "text-rose-300"
                : "text-foreground"
            )}
            aria-label={valueLabel}
          >
            {suffix && trend !== undefined && !trendUp && (
              <TrendingDown className="h-3 w-3 self-center" aria-hidden />
            )}
            {suffix && trend !== undefined && trendUp && (
              <TrendingUp className="h-3 w-3 self-center" aria-hidden />
            )}
            <CountUp
              value={value}
              decimals={decimals}
              prefix={prefix}
              suffix={suffix}
              format={format}
            />
          </span>
          {/* Trend chip only when suffix is NOT already carrying the unit */}
          {trend !== undefined && !suffix && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0 rounded border tabular-nums leading-none",
                trendUp
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/20"
              )}
            >
              {trendUp ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {Math.abs(trend).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
