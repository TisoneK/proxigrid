"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Signal {
  id: string;
  exchangeCode: string;
  symbol: string;
  timeframe: string;
  indicator: string;
  direction: string;
  strength: number;
  price: number;
  note: string | null;
  metadata: string;
  createdAt: string;
}

export function useSignals(limit = 50) {
  return useQuery<Signal[]>({
    queryKey: ["signals", limit],
    queryFn: async () => {
      const res = await fetch(`/api/signals?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      const data = await res.json();
      return data.signals;
    },
    refetchInterval: 30_000,
  });
}

export function useGenerateSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      exchange: string;
      symbol: string;
      timeframe?: string;
    }) => {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to generate signals");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export interface SignalPerformance {
  windowDays: number;
  total: number;
  hitRate1h: number;
  avgReturn1h: number;
  hitRate24h: number;
  avgReturn24h: number;
  byIndicator: Record<
    string,
    {
      total: number;
      hitRate1h: number;
      avgReturn1h: number;
      hitRate24h: number;
      avgReturn24h: number;
    }
  >;
}

/** Outcome stats for directional signals whose 1h/24h horizons have resolved. */
export function useSignalPerformance(days = 7) {
  return useQuery<SignalPerformance>({
    queryKey: ["signal-performance", days],
    queryFn: async () => {
      const res = await fetch(`/api/signals/performance?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch signal performance");
      return res.json();
    },
    refetchInterval: 120_000,
  });
}
