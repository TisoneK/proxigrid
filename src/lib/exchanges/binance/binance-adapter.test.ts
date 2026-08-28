import { describe, it, expect, vi } from "vitest";
import { BinanceAdapter } from "./binance-adapter";

/**
 * Guards the kline -> Candle mapping (a past regression where the response was
 * treated as an array-of-tuples and came back doubly-wrapped). We mock the
 * client so no network call happens.
 */
describe("BinanceAdapter.getCandles mapping", () => {
  it("maps a raw Binance kline row into a flat, numeric Candle", async () => {
    const adapter = new BinanceAdapter({});
    // Binance kline: [openTime, open, high, low, close, volume, closeTime, ...]
    const rawRow = [
      1700000000000,
      "100.5",
      "110.0",
      "99.0",
      "105.25",
      "12.5",
      1700003599999,
      "1312.5",
      100,
      "6.0",
      "630.0",
      "0",
    ];
    vi.spyOn(adapter.getClient(), "getKlines").mockResolvedValue([rawRow] as never);

    const candles = await adapter.getCandles("BTCUSDT", "1h", 1);

    expect(candles).toHaveLength(1);
    const c = candles[0];
    // Flat object, not a nested array — the regression produced the latter.
    expect(Array.isArray(c)).toBe(false);
    expect(c).toEqual({
      openTime: 1700000000000,
      open: 100.5,
      high: 110,
      low: 99,
      close: 105.25,
      volume: 12.5,
      closeTime: 1700003599999,
    });
    // Every OHLCV field is a parsed number, not a string.
    for (const k of ["open", "high", "low", "close", "volume"] as const) {
      expect(typeof c[k]).toBe("number");
    }
  });

  it("returns an empty array when the client yields no klines", async () => {
    const adapter = new BinanceAdapter({});
    vi.spyOn(adapter.getClient(), "getKlines").mockResolvedValue([] as never);
    expect(await adapter.getCandles("BTCUSDT", "1h", 10)).toEqual([]);
  });
});
