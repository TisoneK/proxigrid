"use client";

import { useQuery } from "@tanstack/react-query";

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/** OHLCV candles for a symbol/interval — used by the coin detail chart. */
export function useCandles(
  symbol: string | null,
  interval: string = "1h",
  limit: number = 120,
  exchange: string = "binance"
) {
  return useQuery<Candle[]>({
    queryKey: ["candles", exchange, symbol, interval, limit],
    queryFn: async () => {
      const res = await fetch(
        `/api/markets/${exchange}/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      if (!res.ok) throw new Error("Failed to load candles");
      const data = await res.json();
      return data.candles ?? [];
    },
    enabled: Boolean(symbol),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });
}
