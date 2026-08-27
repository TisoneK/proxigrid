"use client";

import * as React from "react";
import { CountUp } from "@/components/dashboard/count-up";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  valueLabel: string;
  format?: (n: number) => string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sublabel?: string;
  /** Optional trend percentage → colored chip / value tint. */
  trend?: number;
  icon?: React.ReactNode;
  accent?: "emerald" | "teal" | "amber" | "slate";
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  teal: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
  amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  slate: "bg-secondary text-muted-foreground",
};

/** A friendly stat tile: soft icon disc, plain-language label, big value. */
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
  const trendUp = trend !== undefined && trend >= 0;
  const valueColored = suffix !== undefined && trend !== undefined;

  return (
    <div className={cn("card-premium p-4 sm:p-5 flex flex-col gap-3 h-full", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className={cn(
                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                accentMap[accent]
              )}
            >
              <span className="[&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
            </div>
          )}
          <div className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </div>
        </div>

        {trend !== undefined && !suffix && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
              trendUp
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/12 text-rose-600 dark:text-rose-400"
            )}
          >
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(2)}%
          </span>
        )}
      </div>

      <div>
        <div
          className={cn(
            "text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums leading-none flex items-center gap-1",
            valueColored
              ? trendUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
              : "text-foreground"
          )}
          aria-label={valueLabel}
        >
          {valueColored &&
            (trendUp ? (
              <TrendingUp className="h-5 w-5" aria-hidden />
            ) : (
              <TrendingDown className="h-5 w-5" aria-hidden />
            ))}
          <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} format={format} />
        </div>
        {sublabel && (
          <div className="text-xs text-muted-foreground mt-1.5 truncate">{sublabel}</div>
        )}
      </div>
    </div>
  );
}
