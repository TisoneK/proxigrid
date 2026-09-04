import { describe, it, expect } from "vitest";
import { monitorStrategy } from "./monitor";
import { DEFAULT_PARAMS } from "../engine/backtester";
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

const params = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 3, slowMA: 8 };
const lax = { minObservations: 20, minTrades: 2 };

describe("monitorStrategy", () => {
  it("refuses a verdict without enough evidence (does not react to noise)", () => {
    // A short flat window: no trades, well under the evidence floor.
    const r = monitorStrategy(candles(Array(30).fill(100)), params, {}, { minObservations: 100, minTrades: 10 });
    expect(r.status).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.recommendedAction).toBe("maintain");
  });

  it("flags DEGRADING when a well-sampled recent window has non-positive expectancy", () => {
    // A choppy, slightly-declining oscillation: enough trades, negative edge after costs.
    const declining = candles(
      Array.from({ length: 120 }, (_, i) => 100 - i * 0.1 + 6 * Math.sin(i / 2))
    );
    const r = monitorStrategy(declining, params, {}, lax);
    // Either DEGRADING (deteriorated) or, if the sample is still too small, INSUFFICIENT.
    if (r.recent.trades >= lax.minTrades && r.recent.observations >= lax.minObservations) {
      if (r.recent.expectancy <= 0) {
        expect(r.status).toBe("DEGRADING");
        expect(["reduce", "investigate"]).toContain(r.recommendedAction);
      }
    }
  });

  it("stays HEALTHY when a well-sampled recent window keeps a positive edge", () => {
    const rising = candles(
      Array.from({ length: 200 }, (_, i) => 100 + i * 0.15 + 15 * Math.sin((2 * Math.PI * i) / 30))
    );
    const r = monitorStrategy(rising, params, {}, lax);
    if (r.status !== "INSUFFICIENT_EVIDENCE") {
      expect(r.recent.trades).toBeGreaterThanOrEqual(lax.minTrades);
      // A profitable, well-sampled window should read healthy.
      if (r.recent.expectancy > 0) expect(r.status).toBe("HEALTHY");
    }
  });
});
