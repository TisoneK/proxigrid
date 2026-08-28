"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useWatchlist() {
  return useQuery<string[]>({
    queryKey: ["watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error("Failed to load watchlist");
      const d = await res.json();
      return (d.symbols ?? []) as string[];
    },
    staleTime: 30_000,
  });
}

export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ symbol, watched }: { symbol: string; watched: boolean }) => {
      const s = symbol.toUpperCase();
      if (watched) {
        await fetch(`/api/watchlist/${s}`, { method: "DELETE" });
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: s }),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });
}
