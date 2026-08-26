"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: {
    exchange: string;
    symbol: string;
    timeframe: string;
    conditions: Array<Record<string, unknown>>;
    matchMode: "all" | "any";
  };
  action: {
    type: "notify" | "webhook" | "place_order";
    [key: string]: unknown;
  };
  cooldownSec: number;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  executions?: Array<{
    id: string;
    status: string;
    firedAt: string;
    triggerSnapshot: unknown;
    actionResult: unknown;
  }>;
}

export function useAutomationRules() {
  return useQuery<AutomationRule[]>({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const res = await fetch("/api/automation/rules");
      if (!res.ok) throw new Error("Failed to fetch automation rules");
      const data = await res.json();
      return data.rules;
    },
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      trigger: AutomationRule["trigger"];
      action: AutomationRule["action"];
      enabled?: boolean;
      cooldownSec?: number;
    }) => {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create rule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Partial<AutomationRule>) => {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/automation/rules/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle rule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}

export function useTriggerRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger rule");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
    },
  });
}
