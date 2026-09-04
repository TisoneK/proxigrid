import { describe, it, expect } from "vitest";
import { generateMaGrid, generateRsiGrid } from "./generator";

describe("generateMaGrid", () => {
  it("enumerates only valid fast<slow combinations with unique codes", () => {
    const grid = generateMaGrid({ fastMA: [5, 10, 20], slowMA: [10, 20] });
    // valid pairs: (5,10),(5,20),(10,20) — (10,10),(20,10),(20,20),(10,20 ok) etc filtered.
    for (const h of grid) expect(h.params.fastMA).toBeLessThan(h.params.slowMA);
    const codes = grid.map((h) => h.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(grid.every((h) => h.params.strategy === "ma_crossover")).toBe(true);
  });
});

describe("generateRsiGrid", () => {
  it("enumerates only valid oversold<overbought combinations", () => {
    const grid = generateRsiGrid({ rsiPeriod: [7, 14], oversold: [25, 30], overbought: [70, 75] });
    expect(grid.length).toBe(2 * 2 * 2); // all os<ob here
    for (const h of grid) expect(h.params.oversold).toBeLessThan(h.params.overbought);
  });

  it("filters combinations where oversold >= overbought", () => {
    const grid = generateRsiGrid({ rsiPeriod: [14], oversold: [70], overbought: [30] });
    expect(grid).toHaveLength(0);
  });
});
