"use client";

import { cn } from "@/lib/utils";

/**
 * Outcome badges for a graded directional signal — one per resolved horizon.
 * Renders nothing while returns are pending, so ungraded signals look
 * unchanged. Positive = the market moved in the signal's direction.
 */
export function SignalOutcomeBadges({
  direction,
  return1h,
  return24h,
  className,
}: {
  direction: string;
  return1h: number | null;
  return24h: number | null;
  className?: string;
}) {
  if (direction === "neutral") return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {return1h !== null && <OutcomeBadge label="1h" value={return1h} />}
      {return24h !== null && <OutcomeBadge label="24h" value={return24h} />}
    </span>
  );
}

function OutcomeBadge({ label, value }: { label: string; value: number }) {
  const hit = value > 0;
  return (
    <span
      title={`${label} outcome: ${(value * 100) >= 0 ? "+" : ""}${(value * 100).toFixed(2)}% ${
        hit ? "in the signal's favor" : "against the signal"
      }`}
      className={cn(
        "text-[10px] font-semibold tabular-nums px-1.5 py-0 h-4 inline-flex items-center rounded-full",
        hit
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      )}
    >
      {(value * 100) >= 0 ? "+" : ""}
      {(value * 100).toFixed(1)}% {label}
    </span>
  );
}
