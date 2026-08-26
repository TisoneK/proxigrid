"use client";

import { useQuery } from "@tanstack/react-query";

export interface ExchangeInfo {
  code: string;
  name: string;
  kind: string;
  status: string;
  isPaper: boolean;
}

export function useExchanges() {
  return useQuery<ExchangeInfo[]>({
    queryKey: ["exchanges"],
    queryFn: async () => {
      const res = await fetch("/api/exchanges");
      if (!res.ok) throw new Error("Failed to fetch exchanges");
      const data = await res.json();
      return data.exchanges;
    },
    staleTime: 60_000,
  });
}
