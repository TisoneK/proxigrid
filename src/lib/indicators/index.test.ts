import { describe, it, expect } from "vitest";
import type { Candle } from "../exchanges/types";
import { sma, ema, rsi, macd, bollingerBands, lastNonNull } from "./index";

/** Build candles from a list of close prices (other fields don't affect these). */
function candles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    openTime: i,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
    closeTime: i,
  }));
}

describe("sma", () => {
  it("pads leading values with null and averages the window", () => {
    expect(sma(candles([1, 2, 3, 4, 5]), 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("ema", () => {
  it("nulls before the period and seeds with the SMA at period-1", () => {
    const out = ema(candles([1, 2, 3, 4, 5]), 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBeCloseTo(2, 10); // seed = SMA of [1,2,3]
    // next = price*k + prev*(1-k), k = 2/(3+1) = 0.5
    expect(out[3]).toBeCloseTo(4 * 0.5 + 2 * 0.5, 10); // 3
    expect(out[4]).toBeCloseTo(5 * 0.5 + 3 * 0.5, 10); // 4
  });
});

describe("rsi", () => {
  it("returns all null when there are too few candles", () => {
    expect(rsi(candles([1, 2, 3]), 14)).toEqual([null, null, null]);
  });

  it("is 100 for a strictly rising series and 0 for a strictly falling one", () => {
    const rising = rsi(candles([1, 2, 3, 4, 5, 6, 7, 8]), 3);
    const falling = rsi(candles([8, 7, 6, 5, 4, 3, 2, 1]), 3);
    expect(lastNonNull(rising)).toBe(100);
    expect(lastNonNull(falling)).toBe(0);
  });

  it("keeps values within [0, 100]", () => {
    const series = rsi(candles([5, 3, 8, 2, 9, 4, 7, 1, 6, 10, 2, 8]), 5);
    for (const v of series) {
      if (v === null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("macd", () => {
  it("histogram equals macd - signal at the last index (note-consistency guard)", () => {
    const c = candles(Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 10));
    const { macd: line, signal, histogram } = macd(c, 12, 26, 9);
    const h = lastNonNull(histogram)!;
    const m = lastNonNull(line)!;
    const s = lastNonNull(signal)!;
    expect(h).toBeCloseTo(m - s, 9);
  });
});

describe("bollingerBands", () => {
  it("collapses all three bands for a constant series (zero variance)", () => {
    const { middle, upper, lower } = bollingerBands(candles(Array(25).fill(100)), 20, 2);
    expect(lastNonNull(middle)).toBeCloseTo(100, 10);
    expect(lastNonNull(upper)).toBeCloseTo(100, 10);
    expect(lastNonNull(lower)).toBeCloseTo(100, 10);
  });

  it("orders lower < middle < upper for a varying series", () => {
    const c = candles([10, 12, 11, 13, 9, 14, 8, 15, 10, 12, 11, 13, 9, 14, 8, 15, 10, 12, 11, 13, 20]);
    const { middle, upper, lower } = bollingerBands(c, 20, 2);
    const m = lastNonNull(middle)!;
    const u = lastNonNull(upper)!;
    const l = lastNonNull(lower)!;
    expect(l).toBeLessThan(m);
    expect(m).toBeLessThan(u);
  });
});
