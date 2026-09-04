/**
 * Proxigrid Research Engine — Hypothesis generator (docs/RESEARCH-ENGINE.md §7)
 *
 * Phase A: mechanical grid search. Enumerate parameterisations of the named
 * strategies and hand each to the pipeline. Deliberately dumb — it is cheaper
 * to validate the whole pipeline against a grid than to debug an LLM and a
 * leaky backtester at the same time. Generating a hypothesis is never
 * acceptance; the pipeline decides.
 */

import { DEFAULT_PARAMS, type StrategyParams } from "../engine/backtester";
import type { StrategyHypothesis } from "./hypothesis";

export interface MaGridRanges {
  fastMA: number[];
  slowMA: number[];
}

export interface RsiGridRanges {
  rsiPeriod: number[];
  oversold: number[];
  overbought: number[];
}

export interface BollingerGridRanges {
  bbPeriod: number[];
  bbStdDev: number[];
}

export interface DonchianGridRanges {
  donchianPeriod: number[];
}

/** Enumerate valid ma_crossover parameterisations (fast strictly < slow). */
export function generateMaGrid(ranges: MaGridRanges): StrategyHypothesis[] {
  const out: StrategyHypothesis[] = [];
  let i = 0;
  for (const fastMA of ranges.fastMA) {
    for (const slowMA of ranges.slowMA) {
      if (fastMA >= slowMA) continue;
      const params: StrategyParams = { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA, slowMA };
      out.push({
        code: `GRID-ma_crossover-${i++}`,
        description: `MA crossover fast=${fastMA} slow=${slowMA}`,
        params,
      });
    }
  }
  return out;
}

/** Enumerate valid rsi_reversion parameterisations (oversold strictly < overbought). */
export function generateRsiGrid(ranges: RsiGridRanges): StrategyHypothesis[] {
  const out: StrategyHypothesis[] = [];
  let i = 0;
  for (const rsiPeriod of ranges.rsiPeriod) {
    for (const oversold of ranges.oversold) {
      for (const overbought of ranges.overbought) {
        if (oversold >= overbought) continue;
        const params: StrategyParams = {
          ...DEFAULT_PARAMS,
          strategy: "rsi_reversion",
          rsiPeriod,
          oversold,
          overbought,
        };
        out.push({
          code: `GRID-rsi_reversion-${i++}`,
          description: `RSI reversion period=${rsiPeriod} os=${oversold} ob=${overbought}`,
          params,
        });
      }
    }
  }
  return out;
}

/** Enumerate bollinger_reversion parameterisations. */
export function generateBollingerGrid(ranges: BollingerGridRanges): StrategyHypothesis[] {
  const out: StrategyHypothesis[] = [];
  let i = 0;
  for (const bbPeriod of ranges.bbPeriod) {
    for (const bbStdDev of ranges.bbStdDev) {
      const params: StrategyParams = {
        ...DEFAULT_PARAMS,
        strategy: "bollinger_reversion",
        bbPeriod,
        bbStdDev,
      };
      out.push({
        code: `GRID-bollinger_reversion-${i++}`,
        description: `Bollinger reversion period=${bbPeriod} σ=${bbStdDev}`,
        params,
      });
    }
  }
  return out;
}

/** Enumerate donchian_breakout parameterisations. */
export function generateDonchianGrid(ranges: DonchianGridRanges): StrategyHypothesis[] {
  const out: StrategyHypothesis[] = [];
  let i = 0;
  for (const donchianPeriod of ranges.donchianPeriod) {
    const params: StrategyParams = {
      ...DEFAULT_PARAMS,
      strategy: "donchian_breakout",
      donchianPeriod,
    };
    out.push({
      code: `GRID-donchian_breakout-${i++}`,
      description: `Donchian breakout period=${donchianPeriod}`,
      params,
    });
  }
  return out;
}
