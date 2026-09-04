/**
 * Proxigrid Research Engine — The Scientist (docs/RESEARCH-ENGINE.md §7)
 *
 * Finding a historical pattern is easy; deciding whether it is *meaningful* is
 * the hard part. The Scientist runs a strategy on the research window, computes
 * the full metric set, and — crucially — tests whether the edge survives small
 * parameter perturbations. A strategy that only works at EMA=37/RSI=63.4 and
 * collapses when nudged is almost certainly curve-fit noise, not a real edge.
 *
 * Pure: it drives the cost-aware backtester and reads metrics. No DB, no network.
 */

import { runResearchBacktest, type StrategyParams, type BacktestConfig } from "./backtester";
import type { MetricSet } from "./metrics";
import type { Candle } from "@/lib/exchanges/types";

/** Numeric knobs perturbed per strategy for the robustness test. */
const PERTURBABLE: Record<StrategyParams["strategy"], (keyof StrategyParams)[]> = {
  ma_crossover: ["fastMA", "slowMA"],
  rsi_reversion: ["rsiPeriod", "oversold", "overbought"],
};

export interface RobustnessResult {
  param: keyof StrategyParams;
  survives: boolean; // edge stays positive across every perturbation
  baselineReturnPct: number;
  perturbedReturnsPct: number[];
}

export interface ScientistThresholds {
  minObservations: number;
  minTrades: number;
  perturbationPct: number; // e.g. 0.1 → test each param at −10% and +10%
}

export const DEFAULT_THRESHOLDS: ScientistThresholds = {
  minObservations: 100,
  minTrades: 10,
  perturbationPct: 0.1,
};

export interface ScientistReport {
  metrics: MetricSet;
  robustness: RobustnessResult[];
  passed: boolean;
  reasons: string[]; // why it failed (empty when passed)
}

/** Nudge one integer/threshold param by a fraction, keeping it valid. */
function perturbParam(params: StrategyParams, key: keyof StrategyParams, pct: number): StrategyParams {
  const base = params[key];
  if (typeof base !== "number") return params;
  const delta = base * pct;
  // MA periods and RSI period are integers ≥ 1; thresholds stay within 0..100.
  let next = base + delta;
  const isPeriod = key === "fastMA" || key === "slowMA" || key === "rsiPeriod";
  if (isPeriod) next = Math.max(1, Math.round(next));
  else next = Math.max(0, Math.min(100, next));
  return { ...params, [key]: next };
}

/**
 * Evaluate a strategy on the research window: metrics + parameter robustness,
 * then a pass/fail gate (enough activity, positive net expectancy, robust edge).
 */
export function evaluate(
  candles: Candle[],
  params: StrategyParams,
  config: Partial<BacktestConfig> = {},
  thresholds: Partial<ScientistThresholds> = {}
): ScientistReport {
  const th = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const base = runResearchBacktest(candles, params, config);
  const baselineReturnPct = base.metrics.totalReturnPct;

  const robustness: RobustnessResult[] = [];
  for (const key of PERTURBABLE[params.strategy]) {
    const perturbedReturnsPct: number[] = [];
    for (const pct of [-th.perturbationPct, th.perturbationPct]) {
      const variant = perturbParam(params, key, pct);
      perturbedReturnsPct.push(runResearchBacktest(candles, variant, config).metrics.totalReturnPct);
    }
    // "Survives" only makes sense for a baseline that's actually positive: the
    // edge should not vanish under a small nudge.
    const survives =
      baselineReturnPct > 0 ? perturbedReturnsPct.every((r) => r > 0) : false;
    robustness.push({ param: key, survives, baselineReturnPct, perturbedReturnsPct });
  }

  const reasons: string[] = [];
  if (base.metrics.observations < th.minObservations)
    reasons.push(`too few observations (${base.metrics.observations} < ${th.minObservations})`);
  if (base.metrics.trades < th.minTrades)
    reasons.push(`too few trades (${base.metrics.trades} < ${th.minTrades})`);
  if (base.metrics.expectancy <= 0)
    reasons.push(`non-positive net expectancy (${base.metrics.expectancy.toFixed(5)})`);
  if (!robustness.every((r) => r.survives))
    reasons.push(
      `fragile to parameter perturbation (${robustness.filter((r) => !r.survives).map((r) => r.param).join(", ")})`
    );

  return { metrics: base.metrics, robustness, passed: reasons.length === 0, reasons };
}
