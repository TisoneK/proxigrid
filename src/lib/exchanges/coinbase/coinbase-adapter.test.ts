import { describe, it, expect, vi, afterEach } from "vitest";
import { CoinbaseAdapter } from "./coinbase-adapter";
import { CoinbaseClient, type CoinbaseProduct } from "./coinbase-client";

function product(over: Partial<CoinbaseProduct>): CoinbaseProduct {
  return {
    product_id: "BTC-USD",
    price: "77724.04",
    price_percentage_change_24h: "-2.19",
    volume_24h: "9367.01",
    base_currency_id: "BTC",
    quote_currency_id: "USD",
    base_name: "Bitcoin",
    status: "online",
    product_type: "SPOT",
    trading_disabled: false,
    is_disabled: false,
    view_only: false,
    ...over,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("CoinbaseAdapter.getTickers", () => {
  it("keeps only tradable SPOT/USD products and maps them to Tickers", async () => {
    vi.spyOn(CoinbaseClient.prototype, "getProducts").mockResolvedValue([
      product({ product_id: "BTC-USD" }),
      product({ product_id: "ETH-EUR", quote_currency_id: "EUR" }), // wrong quote
      product({ product_id: "DOGE-USD", trading_disabled: true }), // disabled
      product({ product_id: "SOL-USD", status: "online", price: "100", volume_24h: "50" }),
    ]);
    const adapter = new CoinbaseAdapter();
    const tickers = await adapter.getTickers();

    expect(tickers.map((t) => t.symbol).sort()).toEqual(["BTC-USD", "SOL-USD"]);
    const sol = tickers.find((t) => t.symbol === "SOL-USD")!;
    expect(sol.exchangeCode).toBe("coinbase");
    expect(sol.price).toBe(100);
    expect(sol.volume24h).toBe(50);
    expect(sol.quoteVolume24h).toBe(5000); // base * price, for volume sorting
    expect(typeof sol.priceChangePercent24h).toBe("number");
  });

  it("filters to the requested symbols when given", async () => {
    vi.spyOn(CoinbaseClient.prototype, "getProducts").mockResolvedValue([
      product({ product_id: "BTC-USD" }),
      product({ product_id: "SOL-USD" }),
    ]);
    const tickers = await new CoinbaseAdapter().getTickers(["SOL-USD"]);
    expect(tickers).toHaveLength(1);
    expect(tickers[0].symbol).toBe("SOL-USD");
  });
});

describe("CoinbaseAdapter.getCandles", () => {
  it("maps raw candles to numbers and sorts oldest-first", async () => {
    // Coinbase returns most-recent-first.
    vi.spyOn(CoinbaseClient.prototype, "getCandles").mockResolvedValue([
      { start: "1000", low: "9", high: "11", open: "10", close: "10.5", volume: "3" },
      { start: "100", low: "4", high: "6", open: "5", close: "5.5", volume: "2" },
    ]);
    const candles = await new CoinbaseAdapter().getCandles("BTC-USD", "1h", 2);
    expect(candles.map((c) => c.openTime)).toEqual([100_000, 1_000_000]); // ascending, ms
    expect(candles[0]).toEqual({
      openTime: 100_000,
      open: 5,
      high: 6,
      low: 4,
      close: 5.5,
      volume: 2,
      closeTime: (100 + 3600) * 1000,
    });
  });
});

describe("CoinbaseAdapter.getOrderBook", () => {
  it("maps the pricebook levels to {price, quantity}", async () => {
    vi.spyOn(CoinbaseClient.prototype, "getProductBook").mockResolvedValue({
      bids: [{ price: "100", size: "1.5" }],
      asks: [{ price: "101", size: "2.0" }],
      time: "2026-08-29T00:00:00Z",
    });
    const ob = await new CoinbaseAdapter().getOrderBook("BTC-USD", 5);
    expect(ob.exchangeCode).toBe("coinbase");
    expect(ob.bids[0]).toEqual({ price: 100, quantity: 1.5 });
    expect(ob.asks[0]).toEqual({ price: 101, quantity: 2 });
  });
});

describe("CoinbaseAdapter trading methods", () => {
  it("throw a clear market-data-only error", async () => {
    const adapter = new CoinbaseAdapter();
    await expect(adapter.getBalances()).rejects.toThrow(/market-data only/i);
    await expect(
      adapter.placeOrder({ symbol: "BTC-USD", side: "buy", type: "market", quantity: 1 })
    ).rejects.toThrow(/market-data only/i);
  });

  it("reports as unconfigured (no credentials)", () => {
    expect(new CoinbaseAdapter().isConfigured()).toBe(false);
  });
});
