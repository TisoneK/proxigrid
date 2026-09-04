/**
 * Proxigrid Research Engine — Degradation monitor (docs/RESEARCH-ENGINE.md §12, §15)
 *
 * Once a strategy is live, keep asking whether it still works — but distinguish
 * adaptation from chasing noise. A single losing trade contains almost no
 * information; only statistically meaningful deterioration should move a strategy
 * toward DEGRADING. This module enforces that: it refuses to render a verdict at
 * all until there is enough recent evidence (INSUFFICIENT_EVIDENCE), and only then
 * compares recent performance against the strategy's own baseline.
 *
 * Pure — drives the backtester over a recent window. The lifecycle transition it
 * recommends (MONITORING → DEGRADING) is applied by the caller via the state
 * machine; this module only judges.
 */

import { runResearchBacktest, type StrategyParams, type BacktestConfig } from "../engine/backtester";
import type { MetricSet } from "../engine/metrics";
import type { Candle } from "@/lib/exchanges/types";

export type MonitorStatus = "HEALTHY" | "DEGRADING" | "INSUFFICIENT_EVIDENCE";
export type MonitorAction = "maintain" | "investigate" | "reduce" | "disable";

export interface MonitorThresholds {
  /** Minimum recent observations/trades before ANY verdict is rendered (§15). */
  minObservations: number;
  minTrades: number;
  /** Recent expectancy at or below this counts as deteriorated. */
  expectancyFloor: number;
  /**
   * Fraction of the baseline Sharpe the recent Sharpe must retain. Recent Sharpe
   * below baselineSharpe * sharpeRetention is deteriorated. Ignored if no
   * baseline is supplied.
   */
  sharpeRetention: number;
}

export const DEFAULT_MONITOR_THRESHOLDS: MonitorThresholds = {
  minObservations: 100,
  minTrades: 10,
  expectancyFloor: 0,
  sharpeRetention: 0.5,
};

export interface MonitorReport {
  status: MonitorStatus;
  recent: MetricSet;
  reasons: string[];
  recommendedAction: MonitorAction;
}

/**
 * Judge a strategy's recent forward/live window. `baseline` is the strategy's
 * validated performance (e.g. its OOS MetricSet); when omitted, only the
 * absolute floors are used.
 */
export function monitorStrategy(
  recentCandles: Candle[],
  params: StrategyParams,
  config: Partial<BacktestConfig> = {},
  thresholds: Partial<MonitorThresholds> = {},
  baseline?: MetricSet
): MonitorReport {
  const th = { ...DEFAULT_MONITOR_THRESHOLDS, ...thresholds };
  const recent = runResearchBacktest(recentCandles, params, config).metrics;

  // §15: not enough evidence to distinguish signal from noise → do not act.
  if (recent.observations < th.minObservations || recent.trades < th.minTrades) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      recent,
      reasons: [
        `only ${recent.observations} obs / ${recent.trades} trades ` +
          `(need ${th.minObservations} / ${th.minTrades}) — one loss is not evidence`,
      ],
      recommendedAction: "maintain",
    };
  }

  const reasons: string[] = [];
  if (recent.expectancy <= th.expectancyFloor) {
    reasons.push(`recent net expectancy ${recent.expectancy.toFixed(5)} ≤ floor ${th.expectancyFloor}`);
  }
  if (baseline && baseline.sharpe > 0 && recent.sharpe < baseline.sharpe * th.sharpeRetention) {
    reasons.push(
      `recent Sharpe ${recent.sharpe.toFixed(2)} < ${(th.sharpeRetention * 100).toFixed(0)}% of ` +
        `baseline ${baseline.sharpe.toFixed(2)}`
    );
  }

  if (reasons.length === 0) {
    return { status: "HEALTHY", recent, reasons: ["recent performance consistent with baseline"], recommendedAction: "maintain" };
  }

  // Deteriorated. Escalate the action with how negative the recent edge is.
  const action: MonitorAction = recent.expectancy < 0 ? "reduce" : "investigate";
  return { status: "DEGRADING", recent, reasons, recommendedAction: action };
}
