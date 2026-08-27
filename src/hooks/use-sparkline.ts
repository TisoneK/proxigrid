"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Real close-price series for a symbol's mini chart — the last 24 hourly
 * candles. Cached for a minute so a grid of markets doesn't hammer the API.
 */
export function useSparkline(exchange: string, symbol: string) {
  return useQuery<number[]>({
    queryKey: ["sparkline", exchange, symbol],
    queryFn: async () => {
      const res = await fetch(
        `/api/markets/${exchange}/candles?symbol=${symbol}&interval=1h&limit=24`
      );
      if (!res.ok) throw new Error("Failed to load candles");
      const data = await res.json();
      return (data.candles ?? []).map((c: { close: number }) => c.close);
    },
    enabled: Boolean(symbol),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
