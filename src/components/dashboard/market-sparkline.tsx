"use client";

import { Sparkline } from "@/components/dashboard/sparkline";
import { useSparkline } from "@/hooks/use-sparkline";

interface MarketSparklineProps {
  symbol: string;
  exchange?: string;
  width?: number;
  height?: number;
}

/**
 * A market's mini chart, drawn from real recent candles (not synthesized).
 * Renders an empty sparkline area while the data loads.
 */
export function MarketSparkline({
  symbol,
  exchange = "binance",
  width = 64,
  height = 30,
}: MarketSparklineProps) {
  const { data } = useSparkline(exchange, symbol);
  return (
    <Sparkline
      data={data ?? []}
      width={width}
      height={height}
      ariaLabel={`${symbol} 24-hour trend`}
    />
  );
}
