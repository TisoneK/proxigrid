import { describe, it, expect } from "vitest";
import { SIGNAL_GENERATORS } from "./intelligence-service";
import type { Candle } from "../exchanges/types";

const CTX = { exchangeCode: "binance", symbol: "BTCUSDT", timeframe: "1h" as const };

function candles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    openTime: i,
    open: close,
    high: close,
    low: close,
    close,
    volume: 100,
    closeTime: i,
  }));
}

const rising = (n = 60) => candles(Array.from({ length: n }, (_, i) => 100 + i * 2));
const falling = (n = 60) => candles(Array.from({ length: n }, (_, i) => 100 + (n - i) * 2));

describe("RSI generator", () => {
  it("is short on a sustained rise (overbought)", () => {
    const s = SIGNAL_GENERATORS.RSI(rising(), CTX)!;
    expect(s.indicator).toBe("RSI");
    expect(s.direction).toBe("short");
    expect(s.strength).toBeGreaterThanOrEqual(0);
    expect(s.strength).toBeLessThanOrEqual(1);
  });

  it("is long on a sustained fall (oversold)", () => {
    const s = SIGNAL_GENERATORS.RSI(falling(), CTX)!;
    expect(s.direction).toBe("long");
  });
});

describe("MACD generator", () => {
  // MACD reads momentum, so a *linear* ramp flattens the histogram — use a
  // quadratic trend where the per-step change keeps growing, so the histogram
  // stays firmly on the correct side of the signal line.
  const accelUp = candles(Array.from({ length: 60 }, (_, i) => 100 + i * i));
  const accelDown = candles(Array.from({ length: 60 }, (_, i) => 4000 - i * i));

  it("is long on an accelerating rise", () => {
    const s = SIGNAL_GENERATORS.MACD(accelUp, CTX)!;
    expect(s.indicator).toBe("MACD");
    expect(s.direction).toBe("long");
  });

  it("is short on an accelerating fall", () => {
    const s = SIGNAL_GENERATORS.MACD(accelDown, CTX)!;
    expect(s.direction).toBe("short");
  });
});

describe("EMA_CROSS generator", () => {
  it("is long when fast EMA sits above slow (uptrend)", () => {
    const s = SIGNAL_GENERATORS.EMA_CROSS(rising(), CTX)!;
    expect(s.indicator).toBe("EMA_CROSS");
    expect(s.direction).toBe("long");
  });

  it("is short when fast EMA sits below slow (downtrend)", () => {
    const s = SIGNAL_GENERATORS.EMA_CROSS(falling(), CTX)!;
    expect(s.direction).toBe("short");
  });
});

describe("BOLLINGER generator", () => {
  it("is long when the last close pierces the lower band", () => {
    const s = SIGNAL_GENERATORS.BOLLINGER(candles([...Array(24).fill(100), 90]), CTX)!;
    expect(s.indicator).toBe("BOLLINGER");
    expect(s.direction).toBe("long");
  });

  it("is short when the last close pierces the upper band", () => {
    const s = SIGNAL_GENERATORS.BOLLINGER(candles([...Array(24).fill(100), 110]), CTX)!;
    expect(s.direction).toBe("short");
  });

  it("is neutral when the price sits inside the band", () => {
    const s = SIGNAL_GENERATORS.BOLLINGER(candles(Array(25).fill(100)), CTX)!;
    expect(s.direction).toBe("neutral");
  });
});

describe("generator output shape", () => {
  it("always carries the context, a clamped strength, and the last price", () => {
    for (const name of Object.keys(SIGNAL_GENERATORS)) {
      const s = SIGNAL_GENERATORS[name](rising(), CTX);
      expect(s).not.toBeNull();
      if (!s) continue;
      expect(s.symbol).toBe("BTCUSDT");
      expect(s.exchangeCode).toBe("binance");
      expect(s.strength).toBeGreaterThanOrEqual(0);
      expect(s.strength).toBeLessThanOrEqual(1);
      expect(s.price).toBe(rising()[rising().length - 1].close);
    }
  });
});
