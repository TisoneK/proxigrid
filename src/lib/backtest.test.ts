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

  it("zero costs: net equals gross and matches a hand-computed round trip", () => {
    // One MA cross up then down: flat, rise, fall.
    const series = [
      ...Array(25).fill(100),
      ...Array.from({ length: 25 }, (_, i) => 100 + i * 4), // up to 196
      ...Array.from({ length: 25 }, (_, i) => 196 - i * 6), // down to 46
    ];
    const p = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 3, slowMA: 12, feeBps: 0, slippageBps: 0 };
    const r = runBacktest(candles(series), p);
    expect(r.totalTrades).toBeGreaterThanOrEqual(1);
    expect(r.totalReturnPct).toBeCloseTo(r.grossReturnPct, 10);
    // Hand-check the first round trip: net = sell/buy on raw closes (no costs).
    const buy = r.trades[0].price;
    const sell = r.trades[1].price;
    expect(r.grossReturnPct).toBeCloseTo((sell / buy - 1) * 100, 8);
  });

  it("costs drag net below gross by ~2c per round trip", () => {
    const series = [
      ...Array(25).fill(100),
      ...Array.from({ length: 25 }, (_, i) => 100 + i * 4),
      ...Array.from({ length: 25 }, (_, i) => 196 - i * 6),
    ];
    const base = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 3, slowMA: 12 };
    const free = runBacktest(candles(series), { ...base, feeBps: 0, slippageBps: 0 });
    const costed = runBacktest(candles(series), { ...base, feeBps: 100, slippageBps: 0 }); // 1% per side
    expect(free.totalTrades).toBe(costed.totalTrades);
    expect(costed.totalTrades).toBeGreaterThan(0);
    // Each round trip should lose ~2% (2 × 100bps) vs the free run, compounded.
    const expectedDrag = Math.pow(0.99, 2 * costed.totalTrades);
    const actualRatio = (1 + costed.totalReturnPct / 100) / (1 + free.totalReturnPct / 100);
    // The costed run multiplies each round trip by (sellFill/buyFill) = 0.99^2
    // relative to free; mark-to-market legs (no exit) only pay the entry side,
    // so allow tolerance for series ending in-position.
    expect(actualRatio).toBeCloseTo(expectedDrag, 2);
  });

  it("winRate counts net wins: profitable-looking gross is a net loser under costs", () => {
    // A gentle sinusoid with ~+1.7% GROSS over 7 round trips (~24bps/trip) —
    // under the default 15bps/side (~30bps round trip) every trip is a net
    // loss, so winRate must be 0 even though the gross run is profitable.
    const closes: number[] = [];
    for (let i = 0; i < 320; i++) closes.push(100 * (1 + 0.002 * Math.sin((i * 2 * Math.PI) / 40)));
    const r = runBacktest(candles(closes), { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 3, slowMA: 12 });
    expect(r.totalTrades).toBeGreaterThanOrEqual(3);
    expect(r.grossReturnPct).toBeGreaterThan(0);
    expect(r.winRate).toBe(0);
    expect(r.totalReturnPct).toBeLessThan(0);
  });
});
