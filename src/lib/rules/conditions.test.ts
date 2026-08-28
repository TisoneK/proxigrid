import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateAll, type BaseCondition, type RuleContext } from "./conditions";

function ctx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    exchangeCode: "binance",
    symbol: "BTCUSDT",
    timeframe: "1h",
    price: 100,
    candles: [
      { close: 98, volume: 10, openTime: 1 },
      { close: 100, volume: 25, openTime: 2 },
    ],
    indicators: {},
    ...overrides,
  };
}

describe("evaluateCondition — price", () => {
  it("passes when the comparison holds", () => {
    const c: BaseCondition = { type: "price", operator: ">", value: 90 };
    expect(evaluateCondition(c, ctx()).ok).toBe(true);
  });

  it("fails when the comparison does not hold", () => {
    const c: BaseCondition = { type: "price", operator: "<", value: 90 };
    const r = evaluateCondition(c, ctx());
    expect(r.ok).toBe(false);
  });

  it("supports >=, <=, == boundaries", () => {
    expect(evaluateCondition({ type: "price", operator: ">=", value: 100 }, ctx()).ok).toBe(true);
    expect(evaluateCondition({ type: "price", operator: "<=", value: 100 }, ctx()).ok).toBe(true);
    expect(evaluateCondition({ type: "price", operator: "==", value: 100 }, ctx()).ok).toBe(true);
  });

  it("fails cleanly when value is missing", () => {
    const r = evaluateCondition({ type: "price", operator: ">" } as BaseCondition, ctx());
    expect(r.ok).toBe(false);
  });
});

describe("evaluateCondition — indicator simple compare", () => {
  it("compares the latest indicator value", () => {
    const c: BaseCondition = { type: "indicator", indicator: "RSI", period: 14, operator: "<", value: 30 };
    const r = evaluateCondition(c, ctx({ indicators: { RSI_14: [40, 25] } }));
    expect(r.ok).toBe(true);
  });

  it("reports when the indicator series is unavailable", () => {
    const c: BaseCondition = { type: "indicator", indicator: "RSI", period: 14, operator: "<", value: 30 };
    const r = evaluateCondition(c, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not available");
  });

  it("reports when the latest values are null (not ready)", () => {
    const c: BaseCondition = { type: "indicator", indicator: "RSI", period: 14, operator: "<", value: 30 };
    const r = evaluateCondition(c, ctx({ indicators: { RSI_14: [20, null] } }));
    expect(r.ok).toBe(false);
  });
});

describe("evaluateCondition — crosses against a numeric value", () => {
  const base: BaseCondition = {
    type: "indicator",
    indicator: "RSI",
    period: 14,
    operator: "crosses_above",
    value: 30,
  };

  it("detects an upward cross (prev <= value, last > value)", () => {
    const r = evaluateCondition(base, ctx({ indicators: { RSI_14: [28, 32] } }));
    expect(r.ok).toBe(true);
  });

  it("does not fire when already above on the prior bar", () => {
    const r = evaluateCondition(base, ctx({ indicators: { RSI_14: [31, 35] } }));
    expect(r.ok).toBe(false);
  });

  it("detects a downward cross", () => {
    const c: BaseCondition = { ...base, operator: "crosses_below", value: 70 };
    const r = evaluateCondition(c, ctx({ indicators: { RSI_14: [72, 68] } }));
    expect(r.ok).toBe(true);
  });
});

describe("evaluateCondition — crosses against a reference indicator", () => {
  it("detects fast EMA crossing above slow EMA", () => {
    const c: BaseCondition = {
      type: "indicator",
      indicator: "EMA",
      period: 12,
      operator: "crosses_above",
      refIndicator: "EMA",
      refPeriod: 26,
    };
    const r = evaluateCondition(
      c,
      ctx({ indicators: { EMA_12: [99, 101], EMA_26: [100, 100] } })
    );
    expect(r.ok).toBe(true);
  });

  it("does not fire without an actual crossing", () => {
    const c: BaseCondition = {
      type: "indicator",
      indicator: "EMA",
      period: 12,
      operator: "crosses_above",
      refIndicator: "EMA",
      refPeriod: 26,
    };
    const r = evaluateCondition(
      c,
      ctx({ indicators: { EMA_12: [101, 102], EMA_26: [100, 100] } })
    );
    expect(r.ok).toBe(false);
  });
});

describe("evaluateCondition — volume", () => {
  it("compares the latest candle volume", () => {
    const c: BaseCondition = { type: "volume", operator: ">", value: 20 };
    expect(evaluateCondition(c, ctx()).ok).toBe(true); // last volume 25
  });
});

describe("evaluateAll — matchMode", () => {
  const price90: BaseCondition = { type: "price", operator: ">", value: 90 };
  const price200: BaseCondition = { type: "price", operator: ">", value: 200 };

  it("all: matches only when every condition holds", () => {
    expect(evaluateAll([price90, price200], ctx(), "all").matched).toBe(false);
    expect(evaluateAll([price90], ctx(), "all").matched).toBe(true);
  });

  it("any: matches when at least one holds", () => {
    const r = evaluateAll([price90, price200], ctx(), "any");
    expect(r.matched).toBe(true);
    expect(r.notes.length).toBe(1);
    expect(r.reasons.length).toBe(1);
  });
});
