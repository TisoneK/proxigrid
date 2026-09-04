import { describe, it, expect } from "vitest";
import { runLab, strategyCandidate, featureCandidate } from "./lab";
import { generateMaGrid } from "../hypothesis/generator";
import { generateFeatureHypotheses } from "../hypothesis/feature-generator";
import { FeatureRegistry } from "../features/registry";
import { registerBuiltins } from "../features/builtins";
import { InMemoryValidationLedger } from "../data/dataset";
import type { Candle } from "@/lib/exchanges/types";

const sine = (n: number, drift: number, amp: number, period: number): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const close = 100 + drift * i + amp * Math.sin((2 * Math.PI * i) / period);
    return { openTime: i, open: close, high: close, low: close, close, volume: 1, closeTime: i };
  });

const lax = { minObservations: 20, minTrades: 3, perturbationPct: 0.1 };

describe("runLab", () => {
  it("runs a grid of named strategies and ranks survivors by OOS return", async () => {
    const candles = sine(320, 0.15, 15, 30);
    const candidates = generateMaGrid({ fastMA: [3, 5], slowMA: [10, 20] }).map(strategyCandidate);
    const { records, survivors } = await runLab(candidates, candles, {
      ledger: new InMemoryValidationLedger(),
      thresholds: lax,
      critic: { minLatencySurvival: 0 },
    });
    expect(records.length).toBe(candidates.length);
    // Survivors are those that passed, sorted by OOS return descending.
    for (const r of survivors) expect(r.passed).toBe(true);
    for (let i = 1; i < survivors.length; i++) {
      expect(survivors[i - 1].oosMetrics!.totalReturnPct).toBeGreaterThanOrEqual(
        survivors[i].oosMetrics!.totalReturnPct
      );
    }
  });

  it("researches named strategies and feature hypotheses side by side", async () => {
    const registry = new FeatureRegistry();
    registerBuiltins(registry);
    const candles = sine(320, 0.12, 18, 28);
    const strat = generateMaGrid({ fastMA: [3], slowMA: [10] }).map(strategyCandidate);
    const feat = generateFeatureHypotheses([
      { feature: "rsi_14", lowers: [30, 35], uppers: [65, 70], mode: "reversion" },
    ]).map((g) => featureCandidate(g, registry));
    const { records } = await runLab([...strat, ...feat], candles, {
      ledger: new InMemoryValidationLedger(),
      thresholds: lax,
      critic: { minLatencySurvival: 0 },
    });
    expect(records.length).toBe(strat.length + feat.length);
    // Both kinds produced a record with a scientist report — same gauntlet.
    expect(records.every((r) => r.scientist !== undefined)).toBe(true);
  });

  it("dedupes identical specs sharing one validation ledger", async () => {
    const candles = sine(320, 0.15, 15, 30);
    const one = generateMaGrid({ fastMA: [3], slowMA: [10] }).map(strategyCandidate)[0];
    const { records } = await runLab([one, one], candles, {
      ledger: new InMemoryValidationLedger(),
      thresholds: lax,
      critic: { minLatencySurvival: 0 },
    });
    // Second identical spec is either a pre-validation failure or deduped — never a throw.
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records.length).toBeLessThanOrEqual(2);
  });
});
