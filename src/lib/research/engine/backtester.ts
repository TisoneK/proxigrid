/**
 * Proxigrid Research Engine — Cost-aware backtester (research-grade)
 *
 * The source of truth for any go/no-go decision. Unlike the UI-facing
 * `lib/backtest.ts` (long-only, no costs), this simulator:
 *   - supports long *and* short,
 *   - charges fees + slippage + spread on every position change,
 *   - supports position sizing (full / fixed fraction / vol target),
 *   - reports the full honest MetricSet (see engine/metrics.ts).
 *
 * Timing is lookahead-free: a signal computed from the close of bar `i` is
 * executed at that close and only affects returns from bar `i+1` onward.
 *
 * Pure — no DB, no network. Feed it candles.
 */

import { ema, rsi, sma, bollingerBands } from "@/lib/indicators";
import type { Candle } from "@/lib/exchanges/types";
import { barsPerYear, computeMetrics, type MetricSet } from "./metrics";
import { detectRegimes, type Regime } from "../regime/detector";

export type Strategy = "ma_crossover" | "rsi_reversion" | "bollinger_reversion" | "donchian_breakout";

/**
 * Entry gating by market regime (spec §6): "any" is the classic unfiltered
 * strategy; a set of labels admits entries only in those regimes. Exits are
 * NEVER filtered — a position opened in an allowed regime must always be able
 * to close, otherwise a regime shift strands it.
 */
export type RegimeFilter = "any" | readonly Regime[];

export const TREND_FILTER: RegimeFilter = ["TRENDING"];
export const VOL_FILTER: RegimeFilter = ["HIGH_VOL", "BREAKOUT"];

export interface StrategyParams {
  strategy: Strategy;
  fastMA: number;
  slowMA: number;
  rsiPeriod: number;
  oversold: number;
  overbought: number;
  // bollinger_reversion
  bbPeriod: number;
  bbStdDev: number;
  // donchian_breakout
  donchianPeriod: number;
  // regime gating for entries
  regimeFilter: RegimeFilter;
}

export const DEFAULT_PARAMS: StrategyParams = {
  strategy: "ma_crossover",
  fastMA: 7,
  slowMA: 20,
  rsiPeriod: 14,
  oversold: 30,
  overbought: 70,
  bbPeriod: 20,
  bbStdDev: 2,
  donchianPeriod: 20,
  regimeFilter: "any",
};

/** Cost model in basis points (1 bp = 0.01%). Charged per side, on turnover. */
export interface CostModel {
  feeBps: number;
  slippageBps: number;
  spreadBps: number;
}

/** Realistic-ish defaults for Binance spot taker execution. */
export const DEFAULT_COSTS: CostModel = {
  feeBps: 10, // 0.10% taker
  slippageBps: 5,
  spreadBps: 2, // half-spread crossing
};

export type PositionSizing = "full" | "fixed_fraction" | "vol_target";

export interface BacktestConfig {
  timeframe: string; // for annualization
  costs: CostModel;
  allowShort: boolean;
  positionSizing: PositionSizing;
  fraction: number; // for fixed_fraction (0..1)
  volTargetBps: number; // per-bar target vol for vol_target (bps)
  volLookback: number; // bars of realized-vol lookback for vol_target
  maxLeverage: number; // cap on size multiplier
}

export const DEFAULT_CONFIG: BacktestConfig = {
  timeframe: "1h",
  costs: DEFAULT_COSTS,
  allowShort: false,
  positionSizing: "full",
  fraction: 1,
  volTargetBps: 50,
  volLookback: 20,
  maxLeverage: 1,
};

export interface ResearchTrade {
  side: "long" | "short";
  entryIndex: number;
  entryPrice: number;
  exitIndex: number;
  exitPrice: number;
  grossReturn: number; // fraction, before costs
  netReturn: number; // fraction, after round-trip costs
}

export interface ResearchBacktestResult {
  metrics: MetricSet;
  netBarReturns: number[];
  grossBarReturns: number[];
  equity: number[]; // net equity curve, starts at 1
  trades: ResearchTrade[];
  targets: number[]; // per-bar target position sign (−1/0/+1)
}

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

/**
 * Per-bar entry/exit signal for a named strategy: +1 = enter long, −1 = exit
 * (or enter short if shorts allowed), 0 = hold. Mirrors lib/backtest.ts so the
 * two simulators are comparable, but lives here so the research engine has no
 * upward dependency on the UI backtest.
 */
export function strategySignals(candles: Candle[], p: StrategyParams): number[] {
  const raw = rawStrategySignals(candles, p);
  return applyRegimeFilter(raw, candles, p.regimeFilter);
}

/**
 * Mask +1 entries that occur in a disallowed regime. Exits (−1) pass through
 * untouched, and a position already open when the regime disallows re-entry
 * still exits normally — the filter only gates NEW entries.
 */
function applyRegimeFilter(signals: number[], candles: Candle[], filter: RegimeFilter): number[] {
  if (filter === "any") return signals;
  const regimes = detectRegimes(candles);
  const allowed = new Set<string>(filter);
  return signals.map((s, i) => (s === 1 && !allowed.has(regimes[i]) ? 0 : s));
}

function rawStrategySignals(candles: Candle[], p: StrategyParams): number[] {
  const n = candles.length;
  const signals = new Array(n).fill(0);

  if (p.strategy === "bollinger_reversion") return bollingerSignals(candles, p);
  if (p.strategy === "donchian_breakout") return donchianSignals(candles, p);

  if (p.strategy === "ma_crossover") {
    const fast = ema(candles, Math.max(1, p.fastMA));
    const slow = ema(candles, Math.max(1, p.slowMA));
    for (let i = 1; i < n; i++) {
      const f0 = fast[i - 1];
      const s0 = slow[i - 1];
      const f1 = fast[i];
      const s1 = slow[i];
      if (f0 === null || s0 === null || f1 === null || s1 === null) continue;
      if (f0 <= s0 && f1 > s1) signals[i] = 1; // golden cross
      else if (f0 >= s0 && f1 < s1) signals[i] = -1; // death cross
    }
    return signals;
  }

  // rsi_reversion
  const r = rsi(candles, Math.max(2, p.rsiPeriod));
  for (let i = 1; i < n; i++) {
    const prev = r[i - 1];
    const cur = r[i];
    if (prev === null || cur === null) continue;
    if (prev >= p.oversold && cur < p.oversold) signals[i] = 1; // dropped into oversold
    else if (prev <= p.overbought && cur > p.overbought) signals[i] = -1; // rose into overbought
  }
  return signals;
}

function bollingerSignals(candles: Candle[], p: StrategyParams): number[] {
  const n = candles.length;
  const signals = new Array(n).fill(0);
  const { lower, middle, upper } = bollingerBands(candles, Math.max(2, p.bbPeriod), p.bbStdDev);
  for (let i = 1; i < n; i++) {
    const prevClose = candles[i - 1].close;
    const close = candles[i].close;
    const lowerPrev = lower[i - 1];
    const lowerCur = lower[i];
    const midCur = middle[i];
    if (lowerPrev === null || lowerCur === null || midCur === null) continue;
    if (prevClose >= lowerPrev && close < lowerCur) signals[i] = 1; // pierced the lower band
    else if (prevClose <= midCur && close > midCur) signals[i] = -1; // recovered through the mean
  }
  return signals;
}

function donchianSignals(candles: Candle[], p: StrategyParams): number[] {
  const n = candles.length;
  const signals = new Array(n).fill(0);
  const period = Math.max(2, p.donchianPeriod);
  for (let i = period; i < n; i++) {
    // Prior window (exclusive of the current bar) — a classic breakout is a
    // close above the highest high of the PRECEDING `period` bars.
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period; j < i; j++) {
      if (candles[j].high > highest) highest = candles[j].high;
      if (candles[j].low < lowest) lowest = candles[j].low;
    }
    const prevClose = candles[i - 1].close;
    const close = candles[i].close;
    if (prevClose <= highest && close > highest) signals[i] = 1; // broke out upward
    else if (prevClose >= lowest && close < lowest) signals[i] = -1; // broke down
  }
  return signals;
}

/** Convert entry/exit signals into a per-bar target position sign (−1/0/+1). */
export function signalsToTargets(signals: number[], allowShort: boolean): number[] {
  const targets = new Array(signals.length).fill(0);
  let pos = 0;
  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    if (s === 1) pos = 1;
    else if (s === -1) pos = allowShort ? -1 : 0;
    // s === 0 → hold
    targets[i] = pos;
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Sizing
// ---------------------------------------------------------------------------

function sizeFactors(candles: Candle[], targets: number[], cfg: BacktestConfig): number[] {
  const n = candles.length;
  if (cfg.positionSizing === "full") {
    return new Array(n).fill(Math.min(1, cfg.maxLeverage));
  }
  if (cfg.positionSizing === "fixed_fraction") {
    const f = Math.max(0, Math.min(cfg.maxLeverage, cfg.fraction));
    return new Array(n).fill(f);
  }

  // vol_target: scale so recent realized vol ≈ target vol.
  const target = cfg.volTargetBps / 10_000;
  const lb = Math.max(2, cfg.volLookback);
  const rets = new Array(n).fill(0);
  for (let i = 1; i < n; i++) rets[i] = candles[i].close / candles[i - 1].close - 1;

  const factors = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - lb + 1);
    const window = rets.slice(start, i + 1);
    const m = window.reduce((s, x) => s + x, 0) / window.length;
    let sq = 0;
    for (const x of window) sq += (x - m) * (x - m);
    const vol = window.length > 1 ? Math.sqrt(sq / (window.length - 1)) : 0;
    const f = vol > 0 ? target / vol : 0;
    factors[i] = Math.max(0, Math.min(cfg.maxLeverage, f));
  }
  return factors;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

/** Run a research-grade backtest for a named strategy. */
export function runResearchBacktest(
  candles: Candle[],
  params: StrategyParams,
  config: Partial<BacktestConfig> = {}
): ResearchBacktestResult {
  const cfg: BacktestConfig = { ...DEFAULT_CONFIG, ...config };
  const signals = strategySignals(candles, params);
  return simulate(candles, signals, cfg);
}

/**
 * Core simulator over a per-bar entry/exit `signals` array. Exposed directly so
 * future hypotheses (not just the two named strategies) can drive it.
 */
export function simulate(
  candles: Candle[],
  signals: number[],
  config: Partial<BacktestConfig> = {}
): ResearchBacktestResult {
  const cfg: BacktestConfig = { ...DEFAULT_CONFIG, ...config };
  const n = candles.length;
  const costRate =
    (cfg.costs.feeBps + cfg.costs.slippageBps + cfg.costs.spreadBps) / 10_000;

  const targets = signalsToTargets(signals, cfg.allowShort);
  const sizes = sizeFactors(candles, targets, cfg);
  const pos = targets.map((t, i) => t * sizes[i]); // effective position (signed, sized)

  const netBarReturns = new Array(n).fill(0);
  const grossBarReturns = new Array(n).fill(0);
  let turnover = 0;

  if (n > 0) {
    // Establishment cost for the position entering bar 0 (usually 0).
    const d0 = Math.abs(pos[0]);
    turnover += d0;
    netBarReturns[0] = -d0 * costRate;
  }

  for (let i = 1; i < n; i++) {
    const held = pos[i - 1]; // position held over bar i's price move
    const assetRet = candles[i].close / candles[i - 1].close - 1;
    const gross = held * assetRet;
    const dPos = Math.abs(pos[i] - pos[i - 1]); // trade executed at close[i]
    const cost = dPos * costRate;
    turnover += dPos;
    grossBarReturns[i] = gross;
    netBarReturns[i] = gross - cost;
  }

  const equity: number[] = new Array(n);
  let eq = 1;
  for (let i = 0; i < n; i++) {
    eq *= 1 + netBarReturns[i];
    equity[i] = eq;
  }

  const trades = buildBlotter(candles, targets, costRate);
  const metrics = computeMetrics({
    netBarReturns,
    grossBarReturns,
    tradeReturns: trades.map((t) => t.netReturn),
    turnover,
    barsPerYear: barsPerYear(cfg.timeframe),
  });

  return { metrics, netBarReturns, grossBarReturns, equity, trades, targets };
}

/** Build the completed round-trip blotter from the target-position series. */
function buildBlotter(candles: Candle[], targets: number[], costRate: number): ResearchTrade[] {
  const trades: ResearchTrade[] = [];
  const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  let openSign = 0;
  let entryIndex = -1;
  let entryPrice = 0;

  const close = (exitIndex: number, exitPrice: number) => {
    if (openSign === 0 || entryIndex === exitIndex) return; // skip zero-duration
    const gross =
      openSign > 0 ? exitPrice / entryPrice - 1 : entryPrice / exitPrice - 1;
    trades.push({
      side: openSign > 0 ? "long" : "short",
      entryIndex,
      entryPrice,
      exitIndex,
      exitPrice,
      grossReturn: gross,
      netReturn: gross - 2 * costRate, // round-trip cost on notional
    });
  };

  for (let i = 0; i < targets.length; i++) {
    const t = sign(targets[i]);
    if (t !== openSign) {
      close(i, candles[i].close);
      if (t !== 0) {
        openSign = t;
        entryIndex = i;
        entryPrice = candles[i].close;
      } else {
        openSign = 0;
      }
    }
  }
  // Close any position still open at the final bar (mark-to-market exit).
  if (openSign !== 0 && targets.length > 0) {
    close(targets.length - 1, candles[targets.length - 1].close);
  }
  return trades;
}
