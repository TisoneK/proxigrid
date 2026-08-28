import { describe, it, expect } from "vitest";
import { runBacktest, DEFAULT_PARAMS } from "./backtest";
import type { Candle } from "@/hooks/use-candles";

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

describe("runBacktest", () => {
  it("returns an empty result for too few candles", () => {
    const r = runBacktest(candles([1, 2, 3]), DEFAULT_PARAMS);
    expect(r.trades).toEqual([]);
    expect(r.totalTrades).toBe(0);
    expect(r.winRate).toBe(0);
  });

  it("MA crossover: enters long on a rising trend and profits (mark-to-market)", () => {
    // Flat then a strong sustained rise → fast EMA crosses above slow → buy, held to the top.
    const series = [
      ...Array(20).fill(100),
      ...Array.from({ length: 30 }, (_, i) => 100 + i * 2),
    ];
    const r = runBacktest(candles(series), { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 });
    expect(r.trades.length).toBeGreaterThanOrEqual(1);
    expect(r.trades[0].side).toBe("buy");
    expect(r.totalReturnPct).toBeGreaterThan(0);
    expect(r.winRate).toBeGreaterThanOrEqual(0);
    expect(r.winRate).toBeLessThanOrEqual(1);
  });

  it("RSI reversion: completes a round-trip on a dip-then-rip series", () => {
    // Rise (RSI → overbought), fall (RSI crosses *into* oversold → buy),
    // rise again (RSI crosses *into* overbought → sell).
    const rise1 = Array.from({ length: 15 }, (_, i) => 100 + i * 3);
    const fall = Array.from({ length: 15 }, (_, i) => 142 - i * 5);
    const rise2 = Array.from({ length: 15 }, (_, i) => 72 + i * 5);
    const r = runBacktest(candles([...rise1, ...fall, ...rise2]), {
      ...DEFAULT_PARAMS,
      strategy: "rsi_reversion",
      rsiPeriod: 5,
      oversold: 30,
      overbought: 70,
    });
    // The crossings produce at least one completed round-trip with valid metrics.
    expect(r.trades.some((t) => t.side === "buy")).toBe(true);
    expect(r.totalTrades).toBeGreaterThanOrEqual(1);
    expect(r.winRate).toBeGreaterThanOrEqual(0);
    expect(r.winRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.totalReturnPct)).toBe(true);
  });
});
