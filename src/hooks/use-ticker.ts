"use client";

import { useQuery } from "@tanstack/react-query";

export interface Ticker {
  exchangeCode: string;
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume24h?: number;
  quoteVolume24h?: number;
  priceChangePercent24h?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number;
}

export function useTickers(exchangeCode: string | null | undefined) {
  return useQuery<Ticker[]>({
    queryKey: ["tickers", exchangeCode],
    queryFn: async () => {
      if (!exchangeCode) return [];
      const res = await fetch(`/api/markets/${exchangeCode}/ticker`);
      if (!res.ok) throw new Error("Failed to fetch tickers");
      const data = await res.json();
      return data.tickers;
    },
    enabled: Boolean(exchangeCode),
    refetchInterval: 15_000,
  });
}
