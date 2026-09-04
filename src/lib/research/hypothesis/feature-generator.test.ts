import { describe, it, expect } from "vitest";
import { generateFeatureHypotheses } from "./feature-generator";
import { hypothesisSignals } from "./hypothesis";
import { FeatureRegistry } from "../features/registry";
import { registerBuiltins } from "../features/builtins";
import type { Candle } from "@/lib/exchanges/types";

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

describe("generateFeatureHypotheses", () => {
  it("enumerates valid lower<upper threshold pairs with unique codes", () => {
    const gen = generateFeatureHypotheses([
      { feature: "rsi_14", lowers: [25, 30], uppers: [70, 75], mode: "reversion" },
    ]);
    expect(gen).toHaveLength(4); // all pairs valid
    for (const g of gen) expect(g.params.lower).toBeLessThan(g.params.upper);
    expect(new Set(gen.map((g) => g.code)).size).toBe(gen.length);
  });

  it("filters lower>=upper pairs", () => {
    const gen = generateFeatureHypotheses([{ feature: "rsi_14", lowers: [80], uppers: [20] }]);
    expect(gen).toHaveLength(0);
  });

  it("produces a working hypothesis whose signals fire on real feature crossings", () => {
    const registry = new FeatureRegistry();
    registerBuiltins(registry);
    // RSI on a smooth oscillation stays near 50 (here ~32–68), so use thresholds
    // inside that band; the series then crosses both repeatedly.
    const [g] = generateFeatureHypotheses([{ feature: "rsi_14", lowers: [40], uppers: [60] }]);
    const series = candles(Array.from({ length: 120 }, (_, i) => 100 + 20 * Math.sin((2 * Math.PI * i) / 20)));
    const sig = hypothesisSignals(g.build(g.params), series, registry);
    expect(sig.some((s) => s === 1)).toBe(true);
    expect(sig.some((s) => s === -1)).toBe(true);
  });
});
