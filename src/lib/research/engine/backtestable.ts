/**
 * Proxigrid Research Engine — Backtestable (the thing the gates evaluate)
 *
 * The Scientist, Critic and pipeline originally spoke only StrategyParams (the
 * two named strategies). Backtestable is the small abstraction that lets a
 * generic, feature-driven Hypothesis flow through the SAME gates: anything that
 * can produce per-bar signals for a candle array, name its identity for hashing,
 * and generate perturbed variants (for robustness) is testable.
 *
 * Two adapters are provided:
 *   - fromStrategy(params): a named strategy (used by the existing API).
 *   - fromHypothesis(build, params, registry): a generic feature hypothesis,
 *     rebuildable from its numeric params so robustness perturbation works.
 */

import { strategySignals, type StrategyParams } from "./backtester";
import { hypothesisSignals, type Hypothesis } from "../hypothesis/hypothesis";
import type { FeatureRegistry } from "../features/registry";
import type { Candle } from "@/lib/exchanges/types";

export interface Backtestable {
  /** Identity for out-of-sample hashing (see data/dataset.specHash). */
  readonly spec: Record<string, unknown>;
  /** Per-bar entry/exit signals (+1/−1/0) for these candles. */
  signals(candles: Candle[]): number[];
  /** Numeric params that robustness perturbs. */
  perturbableParams(): string[];
  /** A variant with one param scaled by `pct` (e.g. +0.1 = +10%). */
  withPerturbation(param: string, pct: number): Backtestable;
}

/** Numeric knobs perturbed per named strategy. */
const STRATEGY_PERTURBABLE: Record<StrategyParams["strategy"], (keyof StrategyParams)[]> = {
  ma_crossover: ["fastMA", "slowMA"],
  rsi_reversion: ["rsiPeriod", "oversold", "overbought"],
};

/** Nudge one strategy param by a fraction, keeping it valid. */
export function perturbStrategyParam(params: StrategyParams, key: keyof StrategyParams, pct: number): StrategyParams {
  const base = params[key];
  if (typeof base !== "number") return params;
  let next = base + base * pct;
  const isPeriod = key === "fastMA" || key === "slowMA" || key === "rsiPeriod";
  if (isPeriod) next = Math.max(1, Math.round(next));
  else next = Math.max(0, Math.min(100, next));
  return { ...params, [key]: next };
}

/** Adapter for a named strategy. */
export function fromStrategy(params: StrategyParams): Backtestable {
  return {
    spec: { kind: "strategy", strategy: params.strategy, params: { ...params } },
    signals: (candles) => strategySignals(candles, params),
    perturbableParams: () => STRATEGY_PERTURBABLE[params.strategy] as string[],
    withPerturbation: (param, pct) =>
      fromStrategy(perturbStrategyParam(params, param as keyof StrategyParams, pct)),
  };
}

/**
 * Adapter for a generic feature hypothesis. `build` reconstructs the Hypothesis
 * from its numeric params, so perturbation produces a genuinely different
 * hypothesis rather than mutating a closure.
 */
export function fromHypothesis(
  build: (params: Record<string, number>) => Hypothesis,
  params: Record<string, number>,
  registry: FeatureRegistry
): Backtestable {
  return {
    spec: { kind: "hypothesis", id: build(params).id, params: { ...params } },
    signals: (candles) => hypothesisSignals(build(params), candles, registry),
    perturbableParams: () => Object.keys(params),
    withPerturbation: (param, pct) =>
      fromHypothesis(build, { ...params, [param]: params[param] + params[param] * pct }, registry),
  };
}
