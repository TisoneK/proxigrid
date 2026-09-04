/**
 * Proxigrid Research Engine — Hypotheses (docs/RESEARCH-ENGINE.md §4, §7)
 *
 * A hypothesis is a testable proposal, never an accepted strategy. Two shapes:
 *
 *   - StrategyHypothesis: a concrete parameterisation of one of the named
 *     strategies the backtester already understands. This is what the grid
 *     generator emits and what the pipeline runs today (Phase A of §7).
 *   - Hypothesis: the generic form — a per-bar decision over named features
 *     from the feature registry. `hypothesisSignals()` bridges it to the
 *     backtester. This is the foundation for feature-discovery (Phase B) and
 *     the AI researcher (Phase C); it is tested here but not yet wired through
 *     the Scientist/Critic, which still operate on StrategyParams.
 */

import type { StrategyParams } from "../engine/backtester";
import type { FeatureRegistry } from "../features/registry";
import type { Candle } from "@/lib/exchanges/types";

/** A concrete parameterisation of a named strategy. */
export interface StrategyHypothesis {
  code: string; // stable id within a generation run, e.g. "GRID-ma_crossover-3"
  description: string;
  params: StrategyParams;
}

/** The spec that defines a strategy hypothesis's identity (hashed for OOS). */
export function strategySpec(h: StrategyHypothesis): Record<string, unknown> {
  return { kind: "strategy", strategy: h.params.strategy, params: { ...h.params } };
}

/** Generic feature-driven hypothesis (Phase B/C). */
export interface Hypothesis {
  id: string;
  description: string;
  features: string[]; // feature names it reads from the registry
  params: Record<string, number>;
  /** Per-bar decision: +1 enter long, −1 exit (/short), 0 hold. */
  signal(bar: number, f: Record<string, (number | null)[]>): -1 | 0 | 1;
}

/**
 * Bridge a generic Hypothesis to a per-bar signals array the backtester can
 * simulate(): compute each named feature once, then apply the hypothesis's
 * decision at every bar.
 */
export function hypothesisSignals(
  h: Hypothesis,
  candles: Candle[],
  registry: FeatureRegistry
): number[] {
  const f: Record<string, (number | null)[]> = {};
  for (const name of h.features) f[name] = registry.compute(name, candles);
  const signals = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) signals[i] = h.signal(i, f);
  return signals;
}
