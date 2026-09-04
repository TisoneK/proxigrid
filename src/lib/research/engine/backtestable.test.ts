import { describe, it, expect } from "vitest";
import { fromStrategy, fromHypothesis } from "./backtestable";
import { evaluateBacktestable, evaluate } from "./scientist";
import { criticizeBacktestable } from "./critic";
import { runPipelineFor } from "./pipeline";
import { DEFAULT_PARAMS, strategySignals } from "./backtester";
import { FeatureRegistry } from "../features/registry";
import { registerBuiltins } from "../features/builtins";
import { InMemoryValidationLedger } from "../data/dataset";
import type { Hypothesis } from "../hypothesis/hypothesis";
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

const sine = (n: number, drift: number, amp: number, period: number) =>
  candles(Array.from({ length: n }, (_, i) => 100 + drift * i + amp * Math.sin((2 * Math.PI * i) / period)));

describe("fromStrategy — behaviour parity", () => {
  it("produces the same signals and scientist verdict as the named-strategy API", () => {
    const params = { ...DEFAULT_PARAMS, strategy: "ma_crossover" as const, fastMA: 3, slowMA: 10 };
    const c = sine(300, 0.15, 15, 30);
    const b = fromStrategy(params);
    expect(b.signals(c)).toEqual(strategySignals(c, params));
    const viaGeneric = evaluateBacktestable(c, b, {}, { minObservations: 20, minTrades: 3 });
    const viaNamed = evaluate(c, params, {}, { minObservations: 20, minTrades: 3 });
    expect(viaGeneric.passed).toBe(viaNamed.passed);
    expect(viaGeneric.metrics.totalReturnPct).toBeCloseTo(viaNamed.metrics.totalReturnPct, 10);
  });
});

describe("fromHypothesis — a feature-driven hypothesis runs the same gates", () => {
  const registry = new FeatureRegistry();
  registerBuiltins(registry);

  // An RSI mean-reversion hypothesis expressed over the feature registry.
  const build = (p: Record<string, number>): Hypothesis => ({
    id: "rsi-reversion-feature",
    description: `long when rsi_14 < ${p.oversold}, exit when > ${p.overbought}`,
    features: ["rsi_14"],
    params: p,
    signal: (i, f) => {
      const prev = f["rsi_14"][i - 1];
      const cur = f["rsi_14"][i];
      if (prev == null || cur == null) return 0;
      if (prev >= p.oversold && cur < p.oversold) return 1;
      if (prev <= p.overbought && cur > p.overbought) return -1;
      return 0;
    },
  });

  it("computes features, produces signals, and is perturbable for robustness", () => {
    const c = sine(300, 0.1, 20, 25);
    const b = fromHypothesis(build, { oversold: 35, overbought: 65 }, registry);
    expect(b.spec.kind).toBe("hypothesis");
    expect(b.perturbableParams().sort()).toEqual(["overbought", "oversold"]);
    const sig = b.signals(c);
    expect(sig).toHaveLength(c.length);
    expect(sig.some((s) => s !== 0)).toBe(true);
    // A perturbed variant is genuinely different.
    const variant = b.withPerturbation("oversold", 0.1);
    expect(variant.spec).not.toEqual(b.spec);
  });

  it("flows through scientist + critic + one-shot OOS via runPipelineFor", async () => {
    const c = sine(300, 0.1, 20, 25);
    const b = fromHypothesis(build, { oversold: 35, overbought: 65 }, registry);
    const rec = await runPipelineFor("PXG-FEAT-1", b, c, {
      ledger: new InMemoryValidationLedger(),
      thresholds: { minObservations: 20, minTrades: 3 },
      critic: { minLatencySurvival: 0 },
    });
    // Whatever the verdict, the generic hypothesis went through the real gauntlet.
    expect(rec.code).toBe("PXG-FEAT-1");
    expect(rec.scientist).toBeDefined();
    expect(["scientist", "critic", "validation", undefined]).toContain(rec.failedStage);
    // The critic report, when reached, carries the standard battery.
    if (rec.critic) {
      expect(rec.critic.checks.map((x) => x.name)).toContain("survives_costs");
    }
  });
});

describe("withAssetTag", () => {
  it("changes the spec hash per asset but preserves signals and perturbation", async () => {
    const { withAssetTag, fromStrategy } = await import("./backtestable");
    const { specHash } = await import("../data/dataset");
    const params = { ...DEFAULT_PARAMS, strategy: "donchian_breakout" as const, donchianPeriod: 20 };
    const btc = withAssetTag(fromStrategy(params), "BTCUSDT");
    const eth = withAssetTag(fromStrategy(params), "BTCUSDT".replace("BTC", "ETH"));
    expect(specHash(btc.spec)).not.toBe(specHash(eth.spec));
    const c = Array.from({ length: 60 }, (_, i) => ({
      openTime: i, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1, closeTime: i,
    }));
    expect(btc.signals(c)).toEqual(eth.signals(c));
    const perturbed = btc.withPerturbation("donchianPeriod", 0.1);
    expect(perturbed.spec).toMatchObject({ asset: "BTCUSDT" });
  });
});
