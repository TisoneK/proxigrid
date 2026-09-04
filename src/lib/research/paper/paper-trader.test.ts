import { describe, it, expect } from "vitest";
import { PaperTrader } from "./paper-trader";
import { runResearchBacktest, DEFAULT_PARAMS } from "../engine/backtester";
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

const series = candles([
  ...Array(20).fill(100),
  ...Array.from({ length: 40 }, (_, i) => 100 + Math.round(10 * Math.sin(i / 3))),
]);
const params = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 3, slowMA: 8 };

describe("PaperTrader", () => {
  it("matches a full backtest over the same candles (online == batch)", () => {
    const pt = new PaperTrader(params);
    for (const c of series) pt.push(c); // fed one at a time, as if live
    const st = pt.state();
    const full = runResearchBacktest(series, params);
    expect(st.bars).toBe(series.length);
    expect(st.equity).toBeCloseTo(full.equity[full.equity.length - 1], 10);
    expect(st.trades).toBe(full.metrics.trades);
  });

  it("reports the latest position sign", () => {
    const pt = new PaperTrader(params);
    pt.pushAll(series);
    expect([-1, 0, 1]).toContain(pt.state().position);
  });

  it("starts flat with equity 1 before enough history", () => {
    const pt = new PaperTrader(params);
    pt.push(series[0]);
    const st = pt.state();
    expect(st.position).toBe(0);
    expect(st.equity).toBeCloseTo(1, 10);
  });
});
