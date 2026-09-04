/**
 * Proxigrid Research Engine — Regime detector (spec §6)
 *
 * A deliberately simple, transparent, deterministic per-bar classifier. Its job
 * is not to be *right* — it is to let the scientist ask "does this hypothesis
 * behave differently by regime?" and let the lab build regime-specialized
 * strategies. So every label comes from a handful of explainable rolling
 * measures with documented thresholds, not a black box.
 *
 * For each bar `i` (with `lookback` bars of history) we compute three measures
 * over the trailing window, all from closes so they work on OHLC or close-only
 * data:
 *
 *   1. Realized volatility — sample stdev of simple bar returns. High vs low
 *      volatility regimes come straight off this.
 *   2. Trend strength — Kaufman's efficiency ratio: net move over the window
 *      divided by the total path length (sum of absolute bar moves). 1.0 = a
 *      straight line (pure trend), ~0 = lots of motion, no progress (chop).
 *   3. Range expansion/compression — the current bar's amplitude vs the average
 *      amplitude of the preceding window. A sudden jump (BREAKOUT) or a sustained
 *      squeeze (CONSOLIDATION) shows up here.
 *
 * The classifier is a fixed-priority decision tree over those three measures —
 * see `classifyBar`. Pure and dependency-free, hence trivially unit-testable.
 */

import type { Candle } from "@/lib/exchanges/types";

export type Regime =
  | "TRENDING"
  | "RANGING"
  | "HIGH_VOL"
  | "LOW_VOL"
  | "BREAKOUT"
  | "CONSOLIDATION"
  | "UNCERTAIN";

/** Every regime label, for iteration / zero-initialising counts. */
export const REGIMES: readonly Regime[] = [
  "TRENDING",
  "RANGING",
  "HIGH_VOL",
  "LOW_VOL",
  "BREAKOUT",
  "CONSOLIDATION",
  "UNCERTAIN",
] as const;

export interface RegimeOptions {
  /** Trailing window length (bars) for every rolling measure. */
  lookback: number;
  /** Realized-vol (per-bar return stdev) at/above which a bar is HIGH_VOL. */
  highVol: number;
  /** Realized-vol at/below which a bar is LOW_VOL / eligible for CONSOLIDATION. */
  lowVol: number;
  /** Efficiency ratio (0..1) at/above which a bar is TRENDING. */
  trendStrength: number;
  /** Efficiency ratio at/below which a bar is RANGING (choppy, no progress). */
  rangeStrength: number;
  /** Current-vs-recent amplitude ratio at/above which a bar is a BREAKOUT. */
  expansion: number;
  /** Current-vs-recent amplitude ratio at/below which a quiet bar is CONSOLIDATION. */
  compression: number;
}

/**
 * Sane defaults tuned for hourly-ish crypto candles (fractions, not percent):
 *   - highVol 3% / lowVol 0.5% per-bar return stdev,
 *   - trend/range efficiency-ratio band of 0.55 / 0.35,
 *   - a 2.5x amplitude jump reads as a breakout, a 0.5x squeeze as compression.
 * All are options so a caller can retune per timeframe without touching code.
 */
export const DEFAULT_REGIME_OPTIONS: RegimeOptions = {
  lookback: 20,
  highVol: 0.03,
  lowVol: 0.005,
  trendStrength: 0.55,
  rangeStrength: 0.35,
  expansion: 2.5,
  compression: 0.5,
};

/** Sample standard deviation (n−1). Returns 0 for fewer than 2 points. */
function sampleStd(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  const m = sum / n;
  let sq = 0;
  for (const x of xs) sq += (x - m) * (x - m);
  return Math.sqrt(sq / (n - 1));
}

/**
 * Per-bar amplitude as a fraction of price: the true intrabar range when OHLC
 * carries it, falling back to the close-to-close move so close-only candles
 * still yield a meaningful expansion/compression signal.
 */
function amplitude(candles: Candle[], i: number): number {
  if (i <= 0) return 0;
  const c = candles[i].close;
  const hl = c > 0 ? (candles[i].high - candles[i].low) / c : 0;
  const prev = candles[i - 1].close;
  const ret = prev > 0 ? Math.abs(c / prev - 1) : 0;
  return Math.max(hl, ret);
}

/**
 * Classify a single bar from its three precomputed measures. Fixed priority:
 * a live breakout first, then the volatility extremes and trend, then the quiet
 * regimes, then chop — falling through to UNCERTAIN when nothing is decisive.
 */
export function classifyBar(
  vol: number,
  efficiency: number,
  expansionRatio: number,
  opts: RegimeOptions
): Regime {
  // A sudden range expansion beats everything — it *is* the event.
  if (expansionRatio >= opts.expansion && vol > opts.lowVol) return "BREAKOUT";
  // A clean, sustained directional move. Checked before the vol bands so a
  // smooth (hence low-stdev) trend still reads as TRENDING, not LOW_VOL.
  if (efficiency >= opts.trendStrength) return "TRENDING";
  if (vol >= opts.highVol) return "HIGH_VOL";
  // Quiet *and* squeezing = coiling before a move.
  if (vol <= opts.lowVol && expansionRatio <= opts.compression) return "CONSOLIDATION";
  if (vol <= opts.lowVol) return "LOW_VOL";
  // Plenty of motion, little net progress.
  if (efficiency <= opts.rangeStrength) return "RANGING";
  return "UNCERTAIN";
}

/**
 * Classify every bar in `candles`. Returns one label per bar; the leading bars
 * without a full `lookback` window of history are "UNCERTAIN".
 *
 * Output length always equals input length.
 */
export function detectRegimes(
  candles: Candle[],
  opts: Partial<RegimeOptions> = {}
): Regime[] {
  const o: RegimeOptions = { ...DEFAULT_REGIME_OPTIONS, ...opts };
  const lb = Math.max(2, Math.floor(o.lookback));
  const n = candles.length;
  const out: Regime[] = new Array(n).fill("UNCERTAIN");
  if (n === 0) return out;

  // Simple bar returns and per-bar amplitudes, aligned to `candles`.
  const rets = new Array(n).fill(0);
  const amps = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = candles[i - 1].close;
    rets[i] = prev > 0 ? candles[i].close / prev - 1 : 0;
    amps[i] = amplitude(candles, i);
  }

  for (let i = lb; i < n; i++) {
    // Realized volatility over the trailing window of returns.
    const window = rets.slice(i - lb + 1, i + 1);
    const vol = sampleStd(window);

    // Efficiency ratio: net displacement / total path length over the window.
    const net = Math.abs(candles[i].close - candles[i - lb].close);
    let path = 0;
    for (let j = i - lb + 1; j <= i; j++) {
      path += Math.abs(candles[j].close - candles[j - 1].close);
    }
    const efficiency = path > 0 ? net / path : 0;

    // Current amplitude vs the mean amplitude of the preceding window.
    let base = 0;
    for (let j = i - lb; j <= i - 1; j++) base += amps[j];
    base /= lb;
    // A move out of a perfectly flat base (base === 0) is maximal expansion,
    // not "no change" — treat it as Infinity so BREAKOUT can fire.
    const expansionRatio = base > 0 ? amps[i] / base : amps[i] > 0 ? Infinity : 1;

    out[i] = classifyBar(vol, efficiency, expansionRatio, o);
  }

  return out;
}

/**
 * Tally how many bars fall in each regime. Handy for per-regime metric
 * breakdowns in an Experiment. Every label is present (zero when unused).
 */
export function regimeCounts(regimes: Regime[]): Record<Regime, number> {
  const counts = {} as Record<Regime, number>;
  for (const r of REGIMES) counts[r] = 0;
  for (const r of regimes) counts[r] += 1;
  return counts;
}
