"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusDotProps {
  /** Color token — defaults to emerald (live/active). */
  color?: "emerald" | "rose" | "amber" | "slate" | "teal";
  /** Render the pulsing halo ring. */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** ARIA label for screen readers. */
  label?: string;
}

const colorMap: Record<NonNullable<StatusDotProps["color"]>, string> = {
  emerald: "text-emerald-400 bg-emerald-400",
  teal: "text-teal-400 bg-teal-400",
  rose: "text-rose-400 bg-rose-400",
  amber: "text-amber-400 bg-amber-400",
  slate: "text-slate-400 bg-slate-400",
};

const sizeMap: Record<NonNullable<StatusDotProps["size"]>, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

/**
 * A small status indicator dot with an optional pulsing halo.
 * Used in the terminal header (LIVE), on automation rule rows, etc.
 */
export function StatusDot({
  color = "emerald",
  pulse = true,
  size = "md",
  className,
  label,
}: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex", className)} role="status" aria-label={label}>
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-60 animate-ping",
            colorMap[color]
          )}
          style={{ animationDuration: "1.8s" }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeMap[size],
          colorMap[color]
        )}
      />
    </span>
  );
}
