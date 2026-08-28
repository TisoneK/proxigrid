"use client";

import { Star } from "lucide-react";
import { useWatchlist, useToggleWatch } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

/** Star toggle for a symbol; stops propagation so it works inside clickable rows. */
export function WatchStar({
  symbol,
  size = 16,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const { data: watchlist } = useWatchlist();
  const toggle = useToggleWatch();
  const watched = (watchlist ?? []).includes(symbol.toUpperCase());

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate({ symbol, watched });
      }}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={cn(
        "shrink-0 transition-colors",
        watched ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500",
        className
      )}
    >
      <Star style={{ width: size, height: size }} className={cn(watched && "fill-amber-500")} />
    </button>
  );
}
