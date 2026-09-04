/**
 * Proxigrid Research Engine — Monitor service (docs/RESEARCH-ENGINE.md §11)
 *
 * The scheduled half of the lifecycle: re-evaluate every PAPER/LIVE strategy on
 * recent candles, record Experiment(kind:"monitor"), and apply transitions via
 * the pure state machine — MONITORING → DEGRADING only on statistically
 * meaningful deterioration (the monitor's own INSUFFICIENT_EVIDENCE guard
 * prevents single-loss overreactions, §15).
 *
 * Lifecycle mapping (spec §10): LIVE strategies are actively monitored — a
 * healthy verdict keeps them LIVE, deterioration moves them to DEGRADING.
 * PAPER strategies are only observed during their paper-trading apprenticeship;
 * their verdicts are recorded but never change status here.
 */

import { db } from "@/lib/db";
import { getMarketDataService } from "@/lib/services/market-data-service";
import { getResearchStore } from "@/lib/research/store/research-store";
import { monitorStrategy, type MonitorReport } from "@/lib/research/monitor/monitor";
import type { StrategyParams } from "../engine/backtester";
import type { MetricSet } from "../engine/metrics";
import type { Candle } from "@/lib/exchanges/types";

export interface MonitorOutcome {
  code: string;
  status: "HEALTHY" | "DEGRADING" | "INSUFFICIENT_EVIDENCE" | "SKIPPED";
  action?: string;
  transitioned?: string;
  reason?: string;
}

/**
 * One monitor pass over all PAPER/LIVE strategies. Strategies whose spec isn't
 * a named-strategy params object (future: feature hypotheses) are skipped, not
 * failed. Returns one outcome per strategy.
 */
export async function runMonitorPass(): Promise<MonitorOutcome[]> {
  const store = getResearchStore();
  const strategies = await db.strategy.findMany({
    where: { status: { in: ["PAPER", "LIVE", "MONITORING"] } },
    include: { experiments: { where: { kind: "oos" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const outcomes: MonitorOutcome[] = [];
  for (const s of strategies) {
    const params = extractParams(s.spec);
    if (!params) {
      outcomes.push({ code: s.code, status: "SKIPPED", reason: "spec is not a named-strategy params object" });
      continue;
    }

    // Recent window: the monitor needs its own candles; fetch the most recent
    // 400 1h bars regardless of the strategy's timeframe for a consistent
    // recent-performance window across strategies.
    let candles: Candle[];
    try {
      candles = await getMarketDataService().getCandles(s.assets[0] ? "binance" : "binance", s.assets[0], "1h", 400);
    } catch (e) {
      outcomes.push({ code: s.code, status: "SKIPPED", reason: `candle fetch failed: ${(e as Error).message}` });
      continue;
    }
    if (!s.assets.length) {
      outcomes.push({ code: s.code, status: "SKIPPED", reason: "no assets on strategy" });
      continue;
    }

    // The stored OOS metrics JSON is the strategy's validated baseline.
    const baselineRaw = s.experiments[0]?.metrics as unknown;
    const baseline =
      baselineRaw && typeof baselineRaw === "object" && !Array.isArray(baselineRaw)
        ? (baselineRaw as MetricSet)
        : undefined;
    const report: MonitorReport = monitorStrategy(candles, params, { timeframe: "1h" }, {}, baseline);

    // Record the monitor experiment.
    const experiment = await db.experiment.create({
      data: {
        strategyId: s.id,
        kind: "monitor",
        window: { bars: candles.length, monitoredAt: Date.now() },
        costs: { note: "monitor uses engine defaults" },
        metrics: JSON.parse(JSON.stringify(report.recent)),
        criticReport: { passed: report.status !== "DEGRADING", checks: report.reasons.map((r) => ({ name: "monitor", passed: report.status !== "DEGRADING", detail: r })) },
        passed: report.status !== "DEGRADING",
      },
    });
    void experiment;

    // Apply transitions only where the lifecycle calls for it.
    let transitioned: string | undefined;
    const from = s.status as "PAPER" | "LIVE" | "MONITORING";
    if (report.status === "DEGRADING" && from === "LIVE") {
      await store.transitionStrategy(s.id, "MONITORING");
      transitioned = "LIVE → MONITORING";
    } else if (report.status === "DEGRADING" && from === "MONITORING") {
      await store.transitionStrategy(s.id, "DEGRADING");
      transitioned = "MONITORING → DEGRADING";
    }
    // PAPER: recorded, never transitioned here (paper apprenticeship is judged
    // by the → LIVE promotion guard, not by single monitor passes).

    outcomes.push({
      code: s.code,
      status: report.status,
      action: report.recommendedAction,
      transitioned,
      reason: report.reasons[0],
    });
  }
  return outcomes;
}

/** A PAPER/LIVE strategy spec must embed named-strategy params to be monitorable. */
function extractParams(spec: unknown): StrategyParams | null {
  const params = (spec as { params?: unknown })?.params;
  if (!params || typeof params !== "object") return null;
  const p = params as Record<string, unknown>;
  if (p.strategy !== "ma_crossover" && p.strategy !== "rsi_reversion") return null;
  return params as StrategyParams;
}
