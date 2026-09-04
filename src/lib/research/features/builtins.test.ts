import { describe, it, expect } from "vitest";
import type { Candle } from "@/lib/exchanges/types";
import { FeatureRegistry } from "./registry";
import {
  BUILTIN_FEATURES,
  registerBuiltins,
  priceAccelOverVol,
  volumeAccel,
  rsi14,
  ema12,
  ema26,
  sma20,
  macdHist,
  bollingerPctB,
} from "./builtins";
import type { Feature } from "./feature";

/** Build full Candle objects from close (and optional volume) series. */
function candles(closes: number[], volumes?: number[]): Candle[] {
  return closes.map((close, i) => ({
    openTime: i,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: volumes ? volumes[i] : 1,
    closeTime: i,
  }));
}

/**
 * A 60-bar synthetic series that trends up with a ±0.5 oscillation, so one-bar
 * returns (and thus rolling volatility) are strictly positive. Volume ramps with
 * its own oscillation so volume acceleration is non-trivial.
 */
const N = 60;
const closes = Array.from({ length: N }, (_, i) => 100 + i + (i % 2 === 0 ? 0.5 : -0.5));
const volumes = Array.from({ length: N }, (_, i) => 1000 + i * 10 + (i % 2 === 0 ? 25 : -25));
const SERIES = candles(closes, volumes);

/** Assert a series has exactly the right length, leading nulls, then a finite value. */
function expectWarmup(series: (number | null)[], firstValid: number) {
  expect(series).toHaveLength(N);
  for (let i = 0; i < firstValid; i++) {
    expect(series[i], `index ${i} should be null`).toBeNull();
  }
  const v = series[firstValid];
  expect(v, `index ${firstValid} should be finite`).not.toBeNull();
  expect(Number.isFinite(v as number)).toBe(true);
}

describe("built-in indicator features", () => {
  it("exposes the expected named features", () => {
    expect(BUILTIN_FEATURES.map((f) => f.name)).toEqual([
      "rsi_14",
      "ema_12",
      "ema_26",
      "sma_20",
      "macd_hist",
      "bollinger_pctb",
      "price_accel_over_vol",
      "volume_accel",
    ]);
    for (const f of BUILTIN_FEATURES) expect(f.version).toBeGreaterThanOrEqual(1);
  });

  it("rsi_14 warms up over 14 bars", () => {
    expectWarmup(rsi14.compute(SERIES), 14);
  });

  it("ema_12 warms up over its period", () => {
    expectWarmup(ema12.compute(SERIES), 11);
  });

  it("ema_26 warms up over its period", () => {
    expectWarmup(ema26.compute(SERIES), 25);
  });

  it("sma_20 warms up over its period", () => {
    expectWarmup(sma20.compute(SERIES), 19);
  });

  it("macd_hist warms up over slow EMA + signal EMA", () => {
    // Slow EMA(26) first at index 25, then signal EMA(9) over macd values → 25+8.
    expectWarmup(macdHist.compute(SERIES), 33);
  });

  it("bollinger_pctb warms up over its period and stays finite", () => {
    const series = bollingerPctB.compute(SERIES);
    expectWarmup(series, 19);
    // On this rising series the close sits inside the bands → %B roughly in range.
    const v = series[19] as number;
    expect(v).toBeGreaterThan(-0.5);
    expect(v).toBeLessThan(1.5);
  });

  it("bollinger_pctb is null on a perfectly flat window (degenerate bands)", () => {
    const flat = candles(Array.from({ length: 25 }, () => 100));
    const series = bollingerPctB.compute(flat);
    // Bands collapse (upper === lower) → guarded to null, never NaN.
    for (const v of series) expect(v === null || Number.isFinite(v)).toBe(true);
    expect(series[24]).toBeNull();
  });
});

describe("derived features — null-warmup and finiteness", () => {
  it("price_accel_over_vol is null through warmup, then finite", () => {
    const series = priceAccelOverVol(SERIES);
    expect(series).toHaveLength(N);
    expect(series[19]).toBeNull();
    const v = series[20];
    expect(v).not.toBeNull();
    expect(Number.isFinite(v as number)).toBe(true);
  });

  it("price_accel_over_vol returns all nulls for an insufficient history", () => {
    const series = priceAccelOverVol(candles([100, 101, 102, 103, 104]));
    expect(series).toEqual(new Array(5).fill(null));
  });

  it("volume_accel is null through warmup, then finite", () => {
    const series = volumeAccel(SERIES);
    expect(series).toHaveLength(N);
    expect(series[19]).toBeNull();
    const v = series[20];
    expect(v).not.toBeNull();
    expect(Number.isFinite(v as number)).toBe(true);
  });

  it("volume_accel returns all nulls for an insufficient history", () => {
    const series = volumeAccel(candles([1, 2, 3], [10, 20, 30]));
    expect(series).toEqual(new Array(3).fill(null));
  });

  it("volume_accel is zero (not NaN) on constant volume once warmed up", () => {
    const flatVol = candles(closes, new Array(N).fill(500));
    const series = volumeAccel(flatVol);
    expect(series[20]).toBe(0);
  });
});

describe("registerBuiltins", () => {
  it("installs every built-in into a fresh registry", () => {
    const reg = new FeatureRegistry();
    registerBuiltins(reg);
    expect(reg.list()).toHaveLength(BUILTIN_FEATURES.length);
    for (const f of BUILTIN_FEATURES) expect(reg.has(f.name)).toBe(true);
  });

  it("throws if builtins are registered twice into the same registry", () => {
    const reg = new FeatureRegistry();
    registerBuiltins(reg);
    expect(() => registerBuiltins(reg)).toThrow(/already registered/);
  });

  it("computes a derived feature by name through the registry", () => {
    const reg = new FeatureRegistry();
    registerBuiltins(reg);
    const direct = priceAccelOverVol(SERIES);
    const viaRegistry = reg.compute("price_accel_over_vol", SERIES);
    expect(viaRegistry).toEqual(direct);
  });
});

describe("defaultRegistry population", () => {
  it("has the builtins registered on import", async () => {
    const { defaultRegistry } = await import("./registry");
    // Importing builtins.ts (above) runs registerBuiltins(defaultRegistry).
    const names = defaultRegistry.list().map((f: Feature) => f.name);
    expect(names).toEqual(expect.arrayContaining(["rsi_14", "price_accel_over_vol", "volume_accel"]));
  });
});
