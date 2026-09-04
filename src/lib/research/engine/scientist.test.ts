import { describe, it, expect } from "vitest";
import { evaluate } from "./scientist";
import { DEFAULT_PARAMS } from "./backtester";
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

describe("scientist.evaluate", () => {
  it("fails a flat market: too few trades / non-positive expectancy", () => {
    const flat = candles(Array(200).fill(100));
    const r = evaluate(flat, DEFAULT_PARAMS);
    expect(r.passed).toBe(false);
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.some((x) => x.includes("trades") || x.includes("expectancy"))).toBe(true);
  });

  it("reports one robustness result per perturbable param", () => {
    const trend = candles([
      ...Array(20).fill(100),
      ...Array.from({ length: 60 }, (_, i) => 100 + i),
    ]);
    const r = evaluate(trend, { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 });
    // ma_crossover perturbs fastMA + slowMA.
    expect(r.robustness.map((x) => x.param).sort()).toEqual(["fastMA", "slowMA"]);
    for (const rob of r.robustness) {
      expect(rob.perturbedReturnsPct).toHaveLength(2);
      expect(typeof rob.survives).toBe("boolean");
    }
  });

  it("marks a strategy fragile when a param nudge kills the edge", () => {
    // A flat baseline (no positive edge) → survives is false by definition.
    const flat = candles(Array(200).fill(100));
    const r = evaluate(flat, { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 });
    expect(r.robustness.every((x) => x.survives === false)).toBe(true);
  });
});
