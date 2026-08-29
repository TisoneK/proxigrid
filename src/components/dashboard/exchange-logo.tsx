"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Brand colors for the monogram fallback (exchanges without a vendored SVG). */
const BRAND: Record<string, string> = {
  binance: "#F0B90B",
  coinbase: "#0052FF",
  kraken: "#7132F5",
  deriv: "#FF444F",
};

/**
 * An exchange's real brand mark (self-hosted SVG in /public/exchanges, from
 * Simple Icons / CC0). Falls back to a brand-colored monogram for exchanges we
 * don't have a vendored logo for — mirrors CoinLogo's approach.
 */
export function ExchangeLogo({
  code,
  name,
  size = 18,
  className,
}: {
  code: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const label = name ?? code;

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-grid place-items-center rounded-full shrink-0 font-semibold text-white", className)}
        style={{ width: size, height: size, backgroundColor: BRAND[code] ?? "#64748b", fontSize: size * 0.5 }}
      >
        {label.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`/exchanges/${code}.svg`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0", className)}
    />
  );
}
