import { describe, it, expect } from "vitest";
import { criticize } from "./critic";
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

const names = (r: { checks: { name: string }[] }) => r.checks.map((c) => c.name);

describe("critic.criticize", () => {
  it("kills a no-edge flat market (fails survives_costs and holds_across_time)", () => {
    const flat = candles(Array(120).fill(100));
    const r = criticize(flat, DEFAULT_PARAMS);
    expect(r.passed).toBe(false);
    const costs = r.checks.find((c) => c.name === "survives_costs")!;
    expect(costs.passed).toBe(false);
  });

  it("runs the full falsification battery by name", () => {
    const trend = candles([
      ...Array(20).fill(100),
      ...Array.from({ length: 80 }, (_, i) => 100 + i),
    ]);
    const r = criticize(trend, { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 });
    expect(names(r)).toEqual([
      "survives_costs",
      "not_single_event",
      "holds_across_time",
      "survives_execution_latency",
    ]);
  });

  it("flags single-event dependence when there are too few trades", () => {
    // One clean entry near the end → at most one completed trade.
    const series = candles([...Array(60).fill(100), ...Array.from({ length: 15 }, (_, i) => 100 + i)]);
    const r = criticize(series, { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA: 5, slowMA: 15 });
    const single = r.checks.find((c) => c.name === "not_single_event")!;
    expect(single.passed).toBe(false);
  });

  it("adds a cross-asset check only when other assets are supplied", () => {
    const trend = candles([...Array(20).fill(100), ...Array.from({ length: 80 }, (_, i) => 100 + i)]);
    const withOther = criticize(trend, { ...DEFAULT_PARAMS, fastMA: 5, slowMA: 15 }, {}, {
      otherAssets: [{ symbol: "ETHUSDT", candles: trend }],
    });
    expect(names(withOther)).toContain("generalizes_across_assets");
  });
});
