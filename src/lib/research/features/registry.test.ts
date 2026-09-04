import { describe, it, expect } from "vitest";
import { FeatureRegistry } from "./registry";
import type { Feature } from "./feature";
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

/** A trivial feature that echoes each bar's close, for registry-only tests. */
function closeFeature(name: string, version = 1): Feature {
  return { name, version, compute: (cs) => cs.map((c) => c.close) };
}

describe("FeatureRegistry", () => {
  it("registers and retrieves a feature by name", () => {
    const reg = new FeatureRegistry();
    const f = closeFeature("close");
    reg.register(f);
    expect(reg.get("close")).toBe(f);
    expect(reg.has("close")).toBe(true);
  });

  it("returns undefined / false for unknown names", () => {
    const reg = new FeatureRegistry();
    expect(reg.get("missing")).toBeUndefined();
    expect(reg.has("missing")).toBe(false);
  });

  it("lists registered features in insertion order", () => {
    const reg = new FeatureRegistry();
    reg.register(closeFeature("a"));
    reg.register(closeFeature("b"));
    reg.register(closeFeature("c"));
    expect(reg.list().map((f) => f.name)).toEqual(["a", "b", "c"]);
  });

  it("throws when registering a duplicate name", () => {
    const reg = new FeatureRegistry();
    reg.register(closeFeature("dup"));
    expect(() => reg.register(closeFeature("dup"))).toThrow(/already registered/);
  });

  it("computes a registered feature's series", () => {
    const reg = new FeatureRegistry();
    reg.register(closeFeature("close"));
    expect(reg.compute("close", candles([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it("throws when computing an unregistered feature", () => {
    const reg = new FeatureRegistry();
    expect(() => reg.compute("nope", candles([1]))).toThrow(/not registered/);
  });
});
