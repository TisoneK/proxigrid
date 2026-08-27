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
  /** Small monochrome icon shown beside the label. */
  icon?: React.ReactNode;
  /** When set, the tile becomes a button that opens a detail view. */
  onClick?: () => void;
  className?: string;
}

/** A stat tile: plain-language label, big value, optional trend. */
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
  onClick,
  className,
}: StatCardProps) {
  const trendUp = trend !== undefined && trend >= 0;
  const valueColored = suffix !== undefined && trend !== undefined;
  const clickable = !!onClick;

  return (
    <div
      {...(clickable
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            },
          }
        : {})}
      className={cn(
        "card-premium p-3.5 flex flex-col gap-2.5 h-full text-left",
        clickable &&
          "cursor-pointer hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
          {icon && (
            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          )}
          <div className="text-sm font-medium truncate">{label}</div>
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
