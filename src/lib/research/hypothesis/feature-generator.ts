/**
 * Proxigrid Research Engine — Feature hypothesis generator (docs/RESEARCH-ENGINE.md §7 Phase B)
 *
 * Now that the gates are generic (Backtestable), the generator can search over
 * the feature registry rather than only the two named strategies. It emits
 * threshold-crossing hypotheses over a single feature:
 *
 *   - reversion: go long when the feature crosses DOWN through `lower`
 *     (oversold/cheap), exit when it crosses UP through `upper` (rich).
 *   - momentum:  go long when the feature crosses UP through `upper`
 *     (strength), exit when it crosses DOWN through `lower` (weakness).
 *
 * Each hypothesis carries a `build(params)` factory so the Scientist can perturb
 * its thresholds for robustness. Generating a hypothesis is never acceptance —
 * the pipeline decides.
 */

import type { Hypothesis } from "./hypothesis";

export type FeatureMode = "reversion" | "momentum";

export interface FeatureGridSpec {
  feature: string; // a registered feature name, e.g. "rsi_14"
  lowers: number[];
  uppers: number[];
  mode?: FeatureMode; // default "reversion"
}

export interface GeneratedHypothesis {
  code: string;
  build: (params: Record<string, number>) => Hypothesis;
  params: Record<string, number>;
}

function buildFor(feature: string, mode: FeatureMode) {
  return (params: Record<string, number>): Hypothesis => ({
    id: `feat-${feature}-${mode}`,
    description: `${feature} ${mode} lower=${params.lower} upper=${params.upper}`,
    features: [feature],
    params,
    signal: (i, f) => {
      const series = f[feature];
      const prev = series[i - 1];
      const cur = series[i];
      if (prev == null || cur == null) return 0;
      const { lower, upper } = params;
      if (mode === "reversion") {
        if (prev >= lower && cur < lower) return 1; // crossed down into "cheap"
        if (prev <= upper && cur > upper) return -1; // crossed up into "rich"
      } else {
        if (prev <= upper && cur > upper) return 1; // crossed up into strength
        if (prev >= lower && cur < lower) return -1; // crossed down into weakness
      }
      return 0;
    },
  });
}

/** Enumerate feature threshold hypotheses across the supplied grid specs. */
export function generateFeatureHypotheses(specs: FeatureGridSpec[]): GeneratedHypothesis[] {
  const out: GeneratedHypothesis[] = [];
  for (const spec of specs) {
    const mode = spec.mode ?? "reversion";
    let i = 0;
    for (const lower of spec.lowers) {
      for (const upper of spec.uppers) {
        if (lower >= upper) continue;
        out.push({
          code: `FEAT-${spec.feature}-${mode}-${i++}`,
          build: buildFor(spec.feature, mode),
          params: { lower, upper },
        });
      }
    }
  }
  return out;
}
