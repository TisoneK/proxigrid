/**
 * Proxigrid Research Engine — The Critic (docs/RESEARCH-ENGINE.md §8)
 *
 * Every promising strategy gets an opponent whose only job is to disprove it.
 * "Try to kill the strategy before real money does." A strategy that survives
 * aggressive criticism becomes interesting; one that doesn't is discarded cheaply.
 *
 * Each check returns {name, passed, detail}. The report passes only if every
 * critical check passes. Pure — drives the backtester, reads its trades/metrics.
 */

import {
  runResearchBacktest,
  strategySignals,
  simulate,
  type StrategyParams,
  type BacktestConfig,
} from "./backtester";
import type { Candle } from "@/lib/exchanges/types";

export interface CriticCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface CriticReport {
  passed: boolean;
  checks: CriticCheck[];
}

export interface CriticOptions {
  /** Fraction of edge that must survive a 1-bar execution delay (0..1). */
  minLatencySurvival?: number;
  /** Extra assets' candles to test cross-asset generalization (optional). */
  otherAssets?: { symbol: string; candles: Candle[] }[];
}

const DEFAULTS: Required<Pick<CriticOptions, "minLatencySurvival">> = {
  minLatencySurvival: 0.5,
};

/** Delay every entry/exit by one bar (execute at the next bar instead). */
function delaySignals(signals: number[]): number[] {
  const out = new Array(signals.length).fill(0);
  for (let i = 1; i < signals.length; i++) out[i] = signals[i - 1];
  return out;
}

export function criticize(
  candles: Candle[],
  params: StrategyParams,
  config: Partial<BacktestConfig> = {},
  opts: CriticOptions = {}
): CriticReport {
  const o = { ...DEFAULTS, ...opts };
  const base = runResearchBacktest(candles, params, config);
  const netReturn = base.metrics.totalReturnPct;
  const checks: CriticCheck[] = [];

  // 1. Costs — is there still an edge after fees/slippage/spread?
  checks.push({
    name: "survives_costs",
    passed: base.metrics.totalReturnPct > 0 && base.metrics.expectancy > 0,
    detail: `net ${netReturn.toFixed(2)}% after ${base.metrics.costDragPct.toFixed(2)}pp cost drag; expectancy ${base.metrics.expectancy.toFixed(5)}`,
  });

  // 2. Single-event dependence — remove the single best trade; does edge survive?
  const trades = [...base.trades].sort((a, b) => b.netReturn - a.netReturn);
  if (trades.length >= 2) {
    const withoutBest = trades.slice(1);
    // Compound the remaining trade returns as a rough edge proxy.
    const remaining = withoutBest.reduce((eq, t) => eq * (1 + t.netReturn), 1) - 1;
    checks.push({
      name: "not_single_event",
      passed: netReturn <= 0 ? false : remaining > 0,
      detail: `edge without best trade: ${(remaining * 100).toFixed(2)}% (best trade +${(trades[0].netReturn * 100).toFixed(2)}%)`,
    });
  } else {
    checks.push({
      name: "not_single_event",
      passed: false,
      detail: `only ${trades.length} trade(s) — edge cannot be distinguished from a single event`,
    });
  }

  // 3. Holds across time — split research window in halves; edge in BOTH?
  const mid = Math.floor(candles.length / 2);
  const firstHalf = runResearchBacktest(candles.slice(0, mid), params, config).metrics.totalReturnPct;
  const secondHalf = runResearchBacktest(candles.slice(mid), params, config).metrics.totalReturnPct;
  checks.push({
    name: "holds_across_time",
    passed: firstHalf > 0 && secondHalf > 0,
    detail: `first half ${firstHalf.toFixed(2)}%, second half ${secondHalf.toFixed(2)}%`,
  });

  // 4. Execution realism — does the edge survive a realistic 1-bar fill delay?
  const delayed = simulate(candles, delaySignals(strategySignals(candles, params)), config).metrics.totalReturnPct;
  const survival = netReturn > 0 ? delayed / netReturn : 0;
  checks.push({
    name: "survives_execution_latency",
    passed: netReturn > 0 && survival >= o.minLatencySurvival,
    detail: `1-bar-delayed edge ${delayed.toFixed(2)}% = ${(survival * 100).toFixed(0)}% of instant (need ≥${(o.minLatencySurvival * 100).toFixed(0)}%)`,
  });

  // 5. Cross-asset generalization (only if other assets supplied).
  if (o.otherAssets && o.otherAssets.length > 0) {
    const results = o.otherAssets.map((a) => ({
      symbol: a.symbol,
      ret: runResearchBacktest(a.candles, params, config).metrics.totalReturnPct,
    }));
    const positive = results.filter((r) => r.ret > 0).length;
    checks.push({
      name: "generalizes_across_assets",
      passed: positive >= Math.ceil(results.length / 2),
      detail: results.map((r) => `${r.symbol} ${r.ret.toFixed(1)}%`).join(", "),
    });
  }

  return { passed: checks.every((c) => c.passed), checks };
}
