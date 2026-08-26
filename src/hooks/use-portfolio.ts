"use client";

import { useQuery } from "@tanstack/react-query";

export interface PortfolioSummary {
  quoteCurrency: string;
  totalValue: number;
  byExchange: { exchange: { code: string; name: string; isPaper: boolean }; value: number }[];
  holdings: {
    exchangeCode: string;
    asset: string;
    quantity: number;
    priceInQuote: number;
    valueInQuote: number;
  }[];
  unconfiguredExchanges: string[];
}

export function usePortfolio() {
  return useQuery<PortfolioSummary>({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}
