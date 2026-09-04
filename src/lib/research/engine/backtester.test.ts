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

describe("bollinger_reversion signals", () => {
  it("buys on a lower-band pierce and exits through the mean", () => {
    // Flat run-up to seed the bands, a deep dip pierces the lower band,
    // then a recovery back through the mean exits.
    const flat = Array(30).fill(100);
    const dip = [95, 88, 96]; // pierce below, then recover
    const recover = Array.from({ length: 10 }, (_, i) => 98 + i * 0.4);
    const c = candles([...flat, ...dip, ...recover]);
    const r = runResearchBacktest(c, { ...DEFAULT_PARAMS, strategy: "bollinger_reversion", bbPeriod: 20, bbStdDev: 2 }, { costs: NO_COSTS, timeframe: "1h" });
    expect(r.trades.some((t) => t.side === "long")).toBe(true);
  });

  it("generates no signals on a flat series", () => {
    const c = candles(Array(60).fill(100));
    const r = runResearchBacktest(c, { ...DEFAULT_PARAMS, strategy: "bollinger_reversion" }, { costs: NO_COSTS, timeframe: "1h" });
    expect(r.trades.length).toBe(0);
  });
});

describe("donchian_breakout signals", () => {
  it("buys when close breaks the prior N-bar high", () => {
    // Rising staircase where each step exceeds the prior window's high.
    const closes: number[] = [];
    for (let i = 0; i < 40; i++) closes.push(100 + i);
    const c = candles(closes);
    const r = runResearchBacktest(c, { ...DEFAULT_PARAMS, strategy: "donchian_breakout", donchianPeriod: 10 }, { costs: NO_COSTS, timeframe: "1h" });
    expect(r.trades.filter((t) => t.side === "long").length).toBeGreaterThanOrEqual(1);
  });

  it("stays flat in a narrow range (no false breakouts)", () => {
    // Oscillate between 99 and 101: no close exceeds the prior window's high
    // because highs repeat.
    const closes: number[] = [];
    for (let i = 0; i < 60; i++) closes.push(100 + (i % 2 === 0 ? 1 : -1));
    const c = candles(closes);
    const r = runResearchBacktest(c, { ...DEFAULT_PARAMS, strategy: "donchian_breakout", donchianPeriod: 10 }, { costs: NO_COSTS, timeframe: "1h" });
    expect(r.trades.length).toBe(0);
  });
});
