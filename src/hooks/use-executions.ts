"use client";

import { useQuery } from "@tanstack/react-query";

export interface RuleExecution {
  id: string;
  ruleId: string;
  status: string;
  firedAt: string;
  triggerSnapshot: {
    ctx?: { symbol?: string; price?: number; exchange?: string; timeframe?: string };
    notes?: string[];
  };
  actionResult: { status?: string; detail?: string; [key: string]: unknown };
  rule?: { name?: string } | null;
}

/** Recent automation rule executions (rule fires). */
export function useExecutions(limit = 30) {
  return useQuery<RuleExecution[]>({
    queryKey: ["executions", limit],
    queryFn: async () => {
      const res = await fetch(`/api/automation/executions?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load executions");
      const data = await res.json();
      return data.executions ?? [];
    },
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}
