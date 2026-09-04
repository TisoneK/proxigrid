import { describe, it, expect } from "vitest";
import {
  runResearchBacktest,
  simulate,
  DEFAULT_PARAMS,
  DEFAULT_COSTS,
  type CostModel,
} from "./backtester";
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

const NO_COSTS: CostModel = { feeBps: 0, slippageBps: 0, spreadBps: 0 };

describe("simulate — long/short mechanics", () => {
  it("profits from a short in a falling market", () => {
    // Enter short at index 2 (close 100), price then falls 100→90→81.
    const c = candles([100, 100, 100, 90, 81]);
    const signals = [0, 0, -1, 0, 0];
    const r = simulate(c, signals, { allowShort: true, costs: NO_COSTS, timeframe: "1h" });
    // Short of -1 over two −10% moves → +21% compounded.
    expect(r.metrics.totalReturnPct).toBeCloseTo(21, 4);
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].side).toBe("short");
    expect(r.metrics.winRate).toBe(1);
  });

  it("stays flat (no shorts) when shorting is disabled", () => {
    const c = candles([100, 100, 100, 90, 81]);
    const signals = [0, 0, -1, 0, 0];
    const r = simulate(c, signals, { allowShort: false, costs: NO_COSTS, timeframe: "1h" });
    expect(r.trades).toHaveLength(0);
    expect(r.metrics.totalReturnPct).toBeCloseTo(0, 6);
  });
});

describe("runResearchBacktest — costs", () => {
  // A flat base then a strong sustained rise → golden cross → long, held up.
  const rising = candles([
    ...Array(20).fill(100),
    ...Array.from({ length: 30 }, (_, i) => 100 + i * 2),
  ]);

  it("charges costs: net return is lower with fees than without, and cost drag is positive", () => {
    const params = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 5, slowMA: 15 };
    const free = runResearchBacktest(rising, params, { costs: NO_COSTS });
    const withCosts = runResearchBacktest(rising, params, { costs: DEFAULT_COSTS });

    expect(free.metrics.totalReturnPct).toBeGreaterThan(0);
    expect(withCosts.metrics.totalReturnPct).toBeLessThan(free.metrics.totalReturnPct);
    expect(withCosts.metrics.costDragPct).toBeGreaterThan(0);
    expect(free.metrics.costDragPct).toBeCloseTo(0, 6);
  });

  it("keeps win rate within [0,1] and reports finite metrics", () => {
    const r = runResearchBacktest(rising, { ...DEFAULT_PARAMS, fastMA: 5, slowMA: 15 }, { costs: DEFAULT_COSTS });
    expect(r.metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(r.metrics.winRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.metrics.sharpe)).toBe(true);
    expect(Number.isFinite(r.metrics.maxDrawdownPct)).toBe(true);
  });
});

describe("runResearchBacktest — edge cases", () => {
  it("produces no trades and ~zero return on a flat market", () => {
    const flat = candles(Array(60).fill(100));
    const r = runResearchBacktest(flat, DEFAULT_PARAMS, { costs: DEFAULT_COSTS });
    expect(r.trades).toHaveLength(0);
    expect(r.metrics.totalReturnPct).toBeCloseTo(0, 6);
    expect(r.metrics.turnover).toBe(0);
  });

  it("handles too-few candles without throwing", () => {
    const r = runResearchBacktest(candles([1, 2, 3]), DEFAULT_PARAMS);
    expect(r.trades).toEqual([]);
    expect(r.metrics.observations).toBe(3);
  });
});
