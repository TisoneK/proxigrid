/**
 * Proxigrid Research Engine — Built-in features
 *
 * Wraps the existing `lib/indicators` primitives as named, versioned `Feature`s
 * (spec §3) and adds the first derived features from §7 ("feature discovery"):
 * `price_accel_over_vol` and `volume_accel`. Every feature is pure and null-safe
 * — it returns `null` at any bar where its inputs are null or where there is
 * insufficient history — so downstream stages never have to guess whether a
 * value is real.
 *
 * `registerBuiltins(registry)` installs the whole set; the module also registers
 * them into the shared `defaultRegistry` on import for the common case.
 */

import type { Candle } from "@/lib/exchanges/types";
import { ema, sma, rsi, macd, bollingerBands } from "@/lib/indicators";
import type { Feature } from "./feature";
import { FeatureRegistry, defaultRegistry } from "./registry";

// ---------------------------------------------------------------------------
// Indicator wrappers
// ---------------------------------------------------------------------------

/** RSI over a 14-bar window. */
export const rsi14: Feature = {
  name: "rsi_14",
  version: 1,
  compute: (candles) => rsi(candles, 14),
};

/** 12-bar exponential moving average of close. */
export const ema12: Feature = {
  name: "ema_12",
  version: 1,
  compute: (candles) => ema(candles, 12),
};

/** 26-bar exponential moving average of close. */
export const ema26: Feature = {
  name: "ema_26",
  version: 1,
  compute: (candles) => ema(candles, 26),
};

/** 20-bar simple moving average of close. */
export const sma20: Feature = {
  name: "sma_20",
  version: 1,
  compute: (candles) => sma(candles, 20),
};

/** MACD histogram (12/26/9): macd line minus its signal line. */
export const macdHist: Feature = {
  name: "macd_hist",
  version: 1,
  compute: (candles) => macd(candles, 12, 26, 9).histogram,
};

/**
 * Bollinger %B (20, 2σ): where the close sits within the bands.
 * 0 = lower band, 1 = upper band; can exceed [0,1] on band breaks. Null while
 * the bands are undefined or degenerate (upper === lower).
 */
export const bollingerPctB: Feature = {
  name: "bollinger_pctb",
  version: 1,
  compute: (candles) => {
    const { upper, lower } = bollingerBands(candles, 20, 2);
    return candles.map((c, i) => {
      const u = upper[i];
      const l = lower[i];
      if (u === null || l === null) return null;
      const width = u - l;
      if (width === 0) return null; // avoid divide-by-zero on a flat window
      return (c.close - l) / width;
    });
  },
};

// ---------------------------------------------------------------------------
// Derived features (spec §7, Phase B)
// ---------------------------------------------------------------------------

/** Default lookback for the rolling volatility / volume windows. */
const DERIVED_PERIOD = 20;

/** Sample standard deviation (n−1) of a slice; 0 for fewer than 2 points. */
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
 * Price acceleration ÷ rolling volatility (spec §7).
 *
 * Acceleration is the change in one-bar return, `r[i] − r[i−1]` (a scale-free
 * second difference of price), normalized by the sample volatility of returns
 * over the trailing `period` bars. It flags moves that are large relative to
 * the recent regime. Null until there is a full volatility window, and null when
 * that window has zero dispersion (division would be undefined).
 */
export function priceAccelOverVol(candles: Candle[], period = DERIVED_PERIOD): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 2) return out;

  // One-bar simple returns; rets[i] undefined at i = 0.
  const rets: number[] = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const prev = candles[i - 1].close;
    rets[i] = prev !== 0 ? candles[i].close / prev - 1 : 0;
  }

  const lb = Math.max(2, period);
  for (let i = 0; i < n; i++) {
    // Need r[i] and r[i−1] for acceleration, and `lb` returns (indices 1..lb)
    // for the volatility window → first valid bar is `lb`.
    if (i < lb) continue;
    const accel = rets[i] - rets[i - 1];
    const window = rets.slice(i - lb + 1, i + 1); // lb trailing returns
    const vol = sampleStd(window);
    out[i] = vol > 0 ? accel / vol : null;
  }
  return out;
}

/**
 * Volume acceleration (spec §7).
 *
 * The second difference of volume, `v[i] − 2·v[i−1] + v[i−2]`, made scale-free
 * by dividing by the trailing average volume over `period` bars. Positive when
 * participation is ramping up faster than it was. Null until there is a full
 * averaging window, and null when that average is zero.
 */
export function volumeAccel(candles: Candle[], period = DERIVED_PERIOD): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n < 3) return out;

  const lb = Math.max(2, period);
  for (let i = 0; i < n; i++) {
    // Second difference needs v[i], v[i−1], v[i−2]; the average needs `lb`
    // trailing volumes → first valid bar is max(2, lb).
    if (i < lb || i < 2) continue;
    const accel =
      candles[i].volume - 2 * candles[i - 1].volume + candles[i - 2].volume;
    let sum = 0;
    for (let j = i - lb + 1; j <= i; j++) sum += candles[j].volume;
    const avg = sum / lb;
    out[i] = avg > 0 ? accel / avg : null;
  }
  return out;
}

/** Price acceleration relative to trailing return volatility (20-bar). */
export const priceAccelOverVolFeature: Feature = {
  name: "price_accel_over_vol",
  version: 1,
  compute: (candles) => priceAccelOverVol(candles),
};

/** Volume acceleration normalized by trailing average volume (20-bar). */
export const volumeAccelFeature: Feature = {
  name: "volume_accel",
  version: 1,
  compute: (candles) => volumeAccel(candles),
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/** Every built-in feature, in a stable order. */
export const BUILTIN_FEATURES: Feature[] = [
  rsi14,
  ema12,
  ema26,
  sma20,
  macdHist,
  bollingerPctB,
  priceAccelOverVolFeature,
  volumeAccelFeature,
];

/**
 * Register all built-in features into `registry` (defaults to the shared
 * `defaultRegistry`). Throws via the registry if a name is already taken.
 */
export function registerBuiltins(registry: FeatureRegistry = defaultRegistry): FeatureRegistry {
  for (const feature of BUILTIN_FEATURES) registry.register(feature);
  return registry;
}

// Populate the shared registry on import (idempotent across imports within a
// module graph; a second explicit registerBuiltins(defaultRegistry) would throw
// by design).
registerBuiltins(defaultRegistry);
