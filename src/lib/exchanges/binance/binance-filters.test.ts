import { describe, it, expect } from "vitest";
import type { BinanceSymbolFilter } from "./binance-types";
import { validateOrderAgainstFilters } from "./binance-filters";

// Mirrors live BTCUSDT filters: tickSize 0.01, stepSize 0.00001, minNotional 5.
const filters: BinanceSymbolFilter[] = [
  { filterType: "PRICE_FILTER", minPrice: "0.01", maxPrice: "1000000", tickSize: "0.01" },
  { filterType: "LOT_SIZE", minQty: "0.00001", maxQty: "9000", stepSize: "0.00001" },
  { filterType: "NOTIONAL", minNotional: "5" },
];

describe("validateOrderAgainstFilters", () => {
  it("accepts a well-formed limit order", () => {
    expect(
      validateOrderAgainstFilters(filters, { type: "LIMIT", price: 50000.0, quantity: 0.001 })
    ).toEqual({ ok: true });
  });

  it("rejects a price off the tick grid", () => {
    const r = validateOrderAgainstFilters(filters, { type: "LIMIT", price: 50000.005, quantity: 0.001 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/tickSize/);
  });

  it("rejects a quantity off the step grid", () => {
    const r = validateOrderAgainstFilters(filters, { type: "LIMIT", price: 50000, quantity: 0.000013 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/stepSize/);
  });

  it("rejects an order below minNotional", () => {
    const r = validateOrderAgainstFilters(filters, { type: "LIMIT", price: 50000, quantity: 0.00001 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/minNotional/);
  });

  it("rejects quantity below minQty", () => {
    const r = validateOrderAgainstFilters(filters, { type: "LIMIT", price: 50000, quantity: 0.000001 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/minQty/);
  });

  it("requires a price for limit orders", () => {
    const r = validateOrderAgainstFilters(filters, { type: "LIMIT", quantity: 0.001 });
    expect(r.ok).toBe(false);
  });

  it("skips price/notional checks for market orders (no price)", () => {
    // step still applies; use a step-valid qty above minQty
    expect(
      validateOrderAgainstFilters(filters, { type: "MARKET", quantity: 0.001 })
    ).toEqual({ ok: true });
  });

  it("ignores unknown filter types", () => {
    const withUnknown: BinanceSymbolFilter[] = [
      ...filters,
      { filterType: "MAX_NUM_ORDERS", maxNumOrders: 200 },
    ];
    expect(
      validateOrderAgainstFilters(withUnknown, { type: "LIMIT", price: 50000, quantity: 0.001 })
    ).toEqual({ ok: true });
  });
});
