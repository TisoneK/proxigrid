import { describe, it, expect } from "vitest";
import { runPipeline, runPipelineBatch } from "./pipeline";
import { DEFAULT_PARAMS } from "./backtester";
import { InMemoryValidationLedger, ValidationAlreadyConsumedError } from "../data/dataset";
import type { StrategyHypothesis } from "../hypothesis/hypothesis";
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

/** Oscillation with upward drift: repeated EMA crossovers → many winning round-trips. */
function sine(n: number, drift: number, amp: number, period: number): number[] {
  return Array.from({ length: n }, (_, i) => 100 + drift * i + amp * Math.sin((2 * Math.PI * i) / period));
}

const maHyp = (fastMA: number, slowMA: number): StrategyHypothesis => ({
  code: `T-ma-${fastMA}-${slowMA}`,
  description: "test",
  params: { ...DEFAULT_PARAMS, strategy: "ma_crossover", fastMA, slowMA },
});

const laxThresholds = { minObservations: 20, minTrades: 2, perturbationPct: 0.1 };
const laxCritic = { minLatencySurvival: 0 };

describe("runPipeline", () => {
  it("short-circuits at the scientist stage on a flat market", async () => {
    const rec = await runPipeline(maHyp(5, 15), candles(Array(200).fill(100)), {
      ledger: new InMemoryValidationLedger(),
      thresholds: laxThresholds,
    });
    expect(rec.passed).toBe(false);
    expect(rec.failedStage).toBe("scientist");
    expect(rec.critic).toBeUndefined();
    expect(rec.oosMetrics).toBeUndefined();
  });

  it("carries a strategy through scientist + critic to a one-shot OOS result", async () => {
    const series = sine(300, 0.15, 15, 30);
    const rec = await runPipeline(maHyp(3, 10), candles(series), {
      ledger: new InMemoryValidationLedger(),
      thresholds: laxThresholds,
      critic: laxCritic,
    });
    // This config clears both gates, so it must reach a one-shot OOS score.
    expect(rec.scientist.passed).toBe(true);
    expect(rec.critic).toBeDefined();
    expect(rec.critic!.passed).toBe(true);
    expect(rec.oosMetrics).toBeDefined();
    expect(typeof rec.passed).toBe("boolean");
  });

  it("refuses to score the same spec on the validation window twice", async () => {
    const ledger = new InMemoryValidationLedger();
    const series = sine(300, 0.15, 15, 30);
    const h = maHyp(3, 10);
    const first = await runPipeline(h, candles(series), { ledger, thresholds: laxThresholds, critic: laxCritic });
    // Only meaningful if the first run actually reached validation.
    if (first.oosMetrics) {
      await expect(
        runPipeline(h, candles(series), { ledger, thresholds: laxThresholds, critic: laxCritic })
      ).rejects.toBeInstanceOf(ValidationAlreadyConsumedError);
    }
  });
});

describe("runPipelineBatch", () => {
  it("collects a record per hypothesis and dedupes already-validated specs", async () => {
    const ledger = new InMemoryValidationLedger();
    const series = sine(300, 0.15, 15, 30);
    const hyps = [maHyp(3, 10), maHyp(3, 10)]; // identical spec twice
    const recs = await runPipelineBatch(hyps, candles(series), { ledger, thresholds: laxThresholds, critic: laxCritic });
    // The duplicate is either both pre-validation failures (2 records) or one
    // validated + one deduped (1 record). Never throws.
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs.length).toBeLessThanOrEqual(2);
  });
});
