import { describe, it, expect } from "vitest";
import {
  detectRegimes,
  regimeCounts,
  classifyBar,
  DEFAULT_REGIME_OPTIONS,
  REGIMES,
  type Regime,
} from "./detector";
import type { Candle } from "@/lib/exchanges/types";

/** Build close-only candles (high=low=close), like the engine tests do. */
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

/** Regime that occurs most often, ignoring the leading UNCERTAIN warmup. */
function dominant(regimes: Regime[]): Regime {
  const counts = regimeCounts(regimes);
  let best: Regime = "UNCERTAIN";
  let bestN = -1;
  for (const r of REGIMES) {
    if (r === "UNCERTAIN") continue;
    if (counts[r] > bestN) {
      bestN = counts[r];
      best = r;
    }
  }
  return best;
}

describe("detectRegimes — shape and warmup", () => {
  it("returns one label per bar", () => {
    const c = candles(Array.from({ length: 60 }, (_, i) => 100 + i));
    expect(detectRegimes(c)).toHaveLength(c.length);
  });

  it("labels the leading (insufficient-history) bars UNCERTAIN", () => {
    const lb = DEFAULT_REGIME_OPTIONS.lookback;
    const c = candles(Array.from({ length: 60 }, (_, i) => 100 * 1.01 ** i));
    const regimes = detectRegimes(c);
    for (let i = 0; i < lb; i++) expect(regimes[i]).toBe("UNCERTAIN");
    // The first classifiable bar is at index === lookback.
    expect(regimes[lb]).not.toBe("UNCERTAIN");
  });

  it("handles an empty series", () => {
    expect(detectRegimes([])).toEqual([]);
  });
});

describe("detectRegimes — regime behaviour", () => {
  it("classifies a strong monotonic uptrend as mostly TRENDING", () => {
    // Steady compounding rise → efficiency ratio ~1 the whole way.
    const c = candles(Array.from({ length: 80 }, (_, i) => 100 * 1.01 ** i));
    const regimes = detectRegimes(c);
    expect(dominant(regimes)).toBe("TRENDING");
  });

  it("classifies a flat series as mostly LOW_VOL (quiet, no trend)", () => {
    const c = candles(new Array(80).fill(100));
    const regimes = detectRegimes(c);
    expect(dominant(regimes)).toBe("LOW_VOL");
  });

  it("classifies a tight oscillation as mostly RANGING or LOW_VOL", () => {
    // Chop with real motion but no net progress.
    const c = candles(Array.from({ length: 80 }, (_, i) => 100 + (i % 2 === 0 ? 0 : 1)));
    const regimes = detectRegimes(c);
    expect(["RANGING", "LOW_VOL"]).toContain(dominant(regimes));
  });

  it("flags a sudden volatility spike as HIGH_VOL and/or BREAKOUT", () => {
    // ~50 quiet bars, then one large jump followed by big swings.
    const quiet = Array.from({ length: 50 }, (_, i) => 100 + (i % 2 === 0 ? 0 : 0.1));
    const shock = [140, 100, 150, 95, 155, 90, 160, 92, 150, 100];
    const regimes = detectRegimes(candles([...quiet, ...shock]));
    const counts = regimeCounts(regimes);
    expect(counts.HIGH_VOL + counts.BREAKOUT).toBeGreaterThan(0);
  });

  it("produces at least one BREAKOUT on a single explosive bar", () => {
    // Long flat base then a lone large move = pure range expansion.
    const base = new Array(40).fill(100);
    const regimes = detectRegimes(candles([...base, 130]));
    expect(regimes[regimes.length - 1]).toBe("BREAKOUT");
  });
});

describe("classifyBar — decision tree", () => {
  const o = DEFAULT_REGIME_OPTIONS;

  it("prioritises a real breakout over other measures", () => {
    expect(classifyBar(0.02, 0.9, 3.0, o)).toBe("BREAKOUT");
  });

  it("does not call a quiet expansion a breakout", () => {
    // expansion ratio high but vol below the lowVol floor → not an event.
    expect(classifyBar(0.001, 0.1, 5.0, o)).not.toBe("BREAKOUT");
  });

  it("reads a straight-line move as TRENDING even at low vol", () => {
    expect(classifyBar(0.001, 0.95, 1.0, o)).toBe("TRENDING");
  });

  it("reads high dispersion without progress as HIGH_VOL", () => {
    expect(classifyBar(0.05, 0.2, 1.0, o)).toBe("HIGH_VOL");
  });

  it("reads a quiet squeeze as CONSOLIDATION and a quiet-but-not-squeezed bar as LOW_VOL", () => {
    expect(classifyBar(0.002, 0.2, 0.3, o)).toBe("CONSOLIDATION");
    expect(classifyBar(0.002, 0.2, 1.0, o)).toBe("LOW_VOL");
  });

  it("reads mid-vol chop as RANGING", () => {
    expect(classifyBar(0.015, 0.1, 1.0, o)).toBe("RANGING");
  });
});

describe("regimeCounts", () => {
  it("tallies every label and zero-fills the unused ones", () => {
    const counts = regimeCounts(["TRENDING", "TRENDING", "RANGING", "UNCERTAIN"]);
    expect(counts.TRENDING).toBe(2);
    expect(counts.RANGING).toBe(1);
    expect(counts.UNCERTAIN).toBe(1);
    expect(counts.HIGH_VOL).toBe(0);
    // Sum of all counts equals the input length.
    const total = REGIMES.reduce((s, r) => s + counts[r], 0);
    expect(total).toBe(4);
  });
});
