"use client";

import * as React from "react";
import { CoinAvatar } from "@/components/dashboard/coin-avatar";
import { cn } from "@/lib/utils";

interface CoinLogoProps {
  /** Base asset symbol, e.g. "BTC". */
  base: string;
  size?: number;
  className?: string;
}

/**
 * A coin's real logo (self-hosted SVG from cryptocurrency-icons, CC0).
 * Falls back to the monogram CoinAvatar for coins we don't have a logo for.
 */
export function CoinLogo({ base, size = 28, className }: CoinLogoProps) {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return <CoinAvatar base={base} size={size} className={className} />;
  }

  return (
    <img
      src={`/coins/${base.toLowerCase()}.svg`}
      alt={`${base} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-full shrink-0", className)}
    />
  );
}
