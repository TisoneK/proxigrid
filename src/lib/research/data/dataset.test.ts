import { describe, it, expect } from "vitest";
import {
  splitDataset,
  specHash,
  InMemoryValidationLedger,
  scoreOnValidationOnce,
  ValidationAlreadyConsumedError,
} from "./dataset";
import type { Candle } from "@/lib/exchanges/types";

function candles(n: number): Candle[] {
  return Array.from({ length: n }, (_, i) => ({
    openTime: i * 1000,
    open: 100 + i,
    high: 100 + i,
    low: 100 + i,
    close: 100 + i,
    volume: 1,
    closeTime: i * 1000 + 999,
  }));
}

describe("splitDataset", () => {
  it("reserves the most-recent fraction as the (locked) validation tail", () => {
    const s = splitDataset(candles(100), { validationFraction: 0.3 });
    expect(s.research).toHaveLength(70);
    expect(s.validation).toHaveLength(30);
    // Validation is strictly newer than research.
    expect(s.validation[0].openTime).toBeGreaterThan(s.research[s.research.length - 1].openTime);
    expect(s.validationRange.from).toBe(70 * 1000);
  });

  it("applies an embargo gap between research and validation", () => {
    const s = splitDataset(candles(100), { validationFraction: 0.3, embargoBars: 5 });
    expect(s.validation).toHaveLength(30);
    // 5 bars (index 65..69) are dropped from research to prevent boundary leakage.
    expect(s.research).toHaveLength(65);
    expect(s.embargoBars).toBe(5);
  });

  it("rejects degenerate validation fractions", () => {
    expect(() => splitDataset(candles(10), { validationFraction: 0 })).toThrow();
    expect(() => splitDataset(candles(10), { validationFraction: 1 })).toThrow();
  });
});

describe("specHash", () => {
  it("is stable regardless of key order and nesting order", () => {
    const a = { strategy: "ma", params: { fast: 7, slow: 20 }, assets: ["BTC", "ETH"] };
    const b = { assets: ["BTC", "ETH"], params: { slow: 20, fast: 7 }, strategy: "ma" };
    expect(specHash(a)).toBe(specHash(b));
  });

  it("changes when any value changes", () => {
    const base = { strategy: "ma", params: { fast: 7, slow: 20 } };
    const tweaked = { strategy: "ma", params: { fast: 8, slow: 20 } };
    expect(specHash(base)).not.toBe(specHash(tweaked));
  });
});

describe("scoreOnValidationOnce", () => {
  it("scores once and records the spec", async () => {
    const ledger = new InMemoryValidationLedger();
    const spec = { strategy: "ma", params: { fast: 7, slow: 20 } };
    const { result, specHash: h } = await scoreOnValidationOnce(ledger, spec, candles(30), (v) => v.length);
    expect(result).toBe(30);
    expect(ledger.hasRun(h)).toBe(true);
    expect(ledger.size).toBe(1);
  });

  it("refuses a second validation run for the same spec", async () => {
    const ledger = new InMemoryValidationLedger();
    const spec = { strategy: "ma", params: { fast: 7, slow: 20 } };
    await scoreOnValidationOnce(ledger, spec, candles(30), () => 1);
    await expect(scoreOnValidationOnce(ledger, spec, candles(30), () => 2)).rejects.toBeInstanceOf(
      ValidationAlreadyConsumedError
    );
  });

  it("allows a genuinely different spec (new lineage) to be validated", async () => {
    const ledger = new InMemoryValidationLedger();
    await scoreOnValidationOnce(ledger, { fast: 7 }, candles(30), () => 1);
    // A changed parameter is a new spec — permitted.
    await expect(scoreOnValidationOnce(ledger, { fast: 8 }, candles(30), () => 2)).resolves.toMatchObject({
      result: 2,
    });
    expect(ledger.size).toBe(2);
  });
});
