"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ResearchExperiment {
  id: string;
  kind: string; // "backtest" | "oos" | "paper" | "monitor"
  window: { researchRange?: { from: number; to: number }; validationRange?: { from: number; to: number }; specHash?: string };
  costs: { feeBps?: number; slippageBps?: number; spreadBps?: number };
  metrics: {
    trades?: number;
    winRate?: number;
    totalReturnPct?: number;
    sharpe?: number;
    maxDrawdownPct?: number;
    profitFactor?: number;
    costDragPct?: number;
    expectancy?: number;
  };
  criticReport: { passed?: boolean; checks?: { name: string; passed: boolean; detail?: string }[] };
  passed: boolean;
  createdAt: string;
}

export interface ResearchStrategy {
  id: string;
  code: string;
  title: string;
  hypothesis: string;
  status: string; // StrategyStatus
  regime: string | null;
  spec: Record<string, unknown>;
  assets: string[];
  timeframe: string;
  allocation: number;
  experiments: ResearchExperiment[];
  createdAt: string;
}

export function useResearchStrategies() {
  return useQuery<ResearchStrategy[]>({
    queryKey: ["research-strategies"],
    queryFn: async () => {
      const res = await fetch("/api/research/strategies");
      if (!res.ok) throw new Error("Failed to fetch research strategies");
      const data = await res.json();
      return data.strategies;
    },
    refetchInterval: 60_000,
  });
}

export interface LabRunResult {
  ok: boolean;
  candleSource: "history" | "live";
  candles: number;
  candidates: number;
  records: {
    code: string;
    passed: boolean;
    failedStage: string | null;
    specHash: string;
    researchMetrics: ResearchExperiment["metrics"];
    oosMetrics: ResearchExperiment["metrics"] | null;
    criticChecks: { name: string; passed: boolean }[] | null;
  }[];
  survivors: string[];
  strategyIds: Record<string, string>;
  persistedRows: number;
  regimeDistribution: Record<string, number>;
}

export function useRunLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body?: {
      symbol?: string;
      timeframe?: string;
      candles?: number;
      validationFraction?: number;
    }) => {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lab run failed");
      return data as LabRunResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-strategies"] });
    },
  });
}

export function useTransitionStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) => {
      const res = await fetch(`/api/research/strategies/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transition failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-strategies"] });
    },
  });
}
