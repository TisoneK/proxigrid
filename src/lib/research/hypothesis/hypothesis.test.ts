import { describe, it, expect } from "vitest";
import { hypothesisSignals, strategySpec, type Hypothesis, type StrategyHypothesis } from "./hypothesis";
import { FeatureRegistry } from "../features/registry";
import { registerBuiltins } from "../features/builtins";
import { DEFAULT_PARAMS } from "../engine/backtester";
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

describe("hypothesisSignals", () => {
  it("computes named features and applies the per-bar decision", () => {
    const reg = new FeatureRegistry();
    registerBuiltins(reg);
    const h: Hypothesis = {
      id: "rsi-band",
      description: "long when RSI<30, exit when RSI>70",
      features: ["rsi_14"],
      params: {},
      signal: (i, f) => {
        const v = f["rsi_14"][i];
        if (v === null) return 0;
        return v < 30 ? 1 : v > 70 ? -1 : 0;
      },
    };
    // A dip then a rip should drive RSI below 30 then above 70.
    const series = [
      ...Array.from({ length: 20 }, (_, i) => 100 - i * 2),
      ...Array.from({ length: 20 }, (_, i) => 60 + i * 3),
    ];
    const sig = hypothesisSignals(h, candles(series), reg);
    expect(sig).toHaveLength(series.length);
    expect(sig.some((s) => s === 1)).toBe(true);
    expect(sig.some((s) => s === -1)).toBe(true);
  });
});

describe("strategySpec", () => {
  it("captures strategy + params as the identity", () => {
    const h: StrategyHypothesis = {
      code: "X",
      description: "d",
      params: { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 },
    };
    const spec = strategySpec(h);
    expect(spec.kind).toBe("strategy");
    expect(spec.strategy).toBe("ma_crossover");
    expect((spec.params as { fastMA: number }).fastMA).toBe(5);
  });
});
