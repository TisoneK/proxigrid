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
