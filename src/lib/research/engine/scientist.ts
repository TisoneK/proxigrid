/**
 * Proxigrid Research Engine — The Scientist (docs/RESEARCH-ENGINE.md §7)
 *
 * Finding a historical pattern is easy; deciding whether it is *meaningful* is
 * the hard part. The Scientist runs a strategy on the research window, computes
 * the full metric set, and — crucially — tests whether the edge survives small
 * parameter perturbations. A strategy that only works at EMA=37/RSI=63.4 and
 * collapses when nudged is almost certainly curve-fit noise, not a real edge.
 *
 * Generic over Backtestable, so named strategies and feature-driven hypotheses
 * pass through the same gate. Pure: it drives the cost-aware backtester.
 */

import { simulate, type StrategyParams, type BacktestConfig } from "./backtester";
import { fromStrategy, type Backtestable } from "./backtestable";
import type { MetricSet } from "./metrics";
import type { Candle } from "@/lib/exchanges/types";

export interface RobustnessResult {
  param: string;
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

/** Generic evaluation: metrics + parameter robustness + a pass/fail gate. */
export function evaluateBacktestable(
  candles: Candle[],
  b: Backtestable,
  config: Partial<BacktestConfig> = {},
  thresholds: Partial<ScientistThresholds> = {}
): ScientistReport {
  const th = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const base = simulate(candles, b.signals(candles), config);
  const baselineReturnPct = base.metrics.totalReturnPct;

  const robustness: RobustnessResult[] = [];
  for (const key of b.perturbableParams()) {
    const perturbedReturnsPct: number[] = [];
    for (const pct of [-th.perturbationPct, th.perturbationPct]) {
      const variant = b.withPerturbation(key, pct);
      perturbedReturnsPct.push(simulate(candles, variant.signals(candles), config).metrics.totalReturnPct);
    }
    // "Survives" only makes sense for a baseline that's actually positive: the
    // edge should not vanish under a small nudge.
    const survives = baselineReturnPct > 0 ? perturbedReturnsPct.every((r) => r > 0) : false;
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

/** Evaluate a named strategy (thin wrapper over evaluateBacktestable). */
export function evaluate(
  candles: Candle[],
  params: StrategyParams,
  config: Partial<BacktestConfig> = {},
  thresholds: Partial<ScientistThresholds> = {}
): ScientistReport {
  return evaluateBacktestable(candles, fromStrategy(params), config, thresholds);
}
