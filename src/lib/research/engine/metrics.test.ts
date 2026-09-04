import { describe, it, expect } from "vitest";
import { computeMetrics, sanitizeMetrics, barsPerYear, type MetricsInput } from "./metrics";

function input(over: Partial<MetricsInput> = {}): MetricsInput {
  return {
    netBarReturns: [],
    grossBarReturns: [],
    tradeReturns: [],
    turnover: 0,
    barsPerYear: 8_760,
    ...over,
  };
}

describe("barsPerYear", () => {
  it("maps known timeframes and falls back for unknown", () => {
    expect(barsPerYear("1h")).toBe(8_760);
    expect(barsPerYear("1d")).toBe(365);
    expect(barsPerYear("5m")).toBe(105_120);
    expect(barsPerYear("weird")).toBe(365);
  });
});

describe("computeMetrics", () => {
  it("returns zeros (but preserves turnover) for an empty series", () => {
    const m = computeMetrics(input({ turnover: 3 }));
    expect(m.observations).toBe(0);
    expect(m.totalReturnPct).toBe(0);
    expect(m.turnover).toBe(3);
  });

  it("compounds net bar returns into total return", () => {
    // 1 * 1.1 * 0.95 = 1.045 → +4.5%
    const m = computeMetrics(
      input({ netBarReturns: [0, 0.1, -0.05], grossBarReturns: [0, 0.1, -0.05] })
    );
    expect(m.totalReturnPct).toBeCloseTo(4.5, 6);
    expect(m.costDragPct).toBeCloseTo(0, 6);
  });

  it("computes win rate and profit factor from the trade blotter", () => {
    const m = computeMetrics(input({ netBarReturns: [0.01], grossBarReturns: [0.01], tradeReturns: [0.2, -0.1, 0.1] }));
    expect(m.trades).toBe(3);
    expect(m.winRate).toBeCloseTo(2 / 3, 6);
    expect(m.profitFactor).toBeCloseTo(3, 6); // 0.3 / 0.1
  });

  it("reports profit factor as Infinity when there are no losing trades", () => {
    const m = computeMetrics(input({ netBarReturns: [0.01], grossBarReturns: [0.01], tradeReturns: [0.2, 0.1] }));
    expect(m.profitFactor).toBe(Infinity);
    expect(sanitizeMetrics(m).profitFactor).toBe(9_999);
  });

  it("computes max drawdown from the equity curve", () => {
    // equity: 1.1, 0.88, 0.924 → peak 1.1, trough 0.88 → 20% DD
    const m = computeMetrics(input({ netBarReturns: [0.1, -0.2, 0.05], grossBarReturns: [0.1, -0.2, 0.05] }));
    expect(m.maxDrawdownPct).toBeCloseTo(20, 6);
  });

  it("surfaces cost drag as gross minus net", () => {
    const m = computeMetrics(input({ netBarReturns: [0.09], grossBarReturns: [0.1] }));
    expect(m.totalReturnPct).toBeCloseTo(9, 6);
    expect(m.costDragPct).toBeCloseTo(1, 6);
  });

  it("gives zero Sharpe/Sortino when returns have no dispersion", () => {
    const m = computeMetrics(input({ netBarReturns: [0.01, 0.01, 0.01], grossBarReturns: [0.01, 0.01, 0.01] }));
    expect(m.sharpe).toBe(0);
    expect(m.sortino).toBe(0);
  });
});
