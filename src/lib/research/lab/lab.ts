/**
 * Proxigrid Research Engine — The Lab (docs/RESEARCH-ENGINE.md §16)
 *
 * The research loop, minus the AI (step 9) and DB persistence (deferred):
 * take a batch of candidate strategies, run each through the full pipeline
 * (split → scientist → critic → one-shot OOS), and return every record plus the
 * survivors ranked by out-of-sample performance.
 *
 * It speaks the generic Backtestable, so named strategies and feature-driven
 * hypotheses can be researched side by side. Pure and injectable — a Prisma-
 * backed store drops in later to persist Strategy/Experiment rows.
 */

import { runPipelineFor, type ExperimentRecord, type PipelineOptions } from "../engine/pipeline";
import { fromStrategy, fromHypothesis, type Backtestable } from "../engine/backtestable";
import type { StrategyHypothesis } from "../hypothesis/hypothesis";
import type { GeneratedHypothesis } from "../hypothesis/feature-generator";
import type { FeatureRegistry } from "../features/registry";
import type { Candle } from "@/lib/exchanges/types";

export interface Candidate {
  code: string;
  backtestable: Backtestable;
}

export interface LabResult {
  records: ExperimentRecord[];
  /** passed === true, ranked by out-of-sample total return (desc). */
  survivors: ExperimentRecord[];
}

/** Adapt a named-strategy hypothesis into a lab candidate. */
export function strategyCandidate(h: StrategyHypothesis): Candidate {
  return { code: h.code, backtestable: fromStrategy(h.params) };
}

/** Adapt a generated feature hypothesis into a lab candidate. */
export function featureCandidate(g: GeneratedHypothesis, registry: FeatureRegistry): Candidate {
  return { code: g.code, backtestable: fromHypothesis(g.build, g.params, registry) };
}

/**
 * Run every candidate through the pipeline over the same candles. Candidates
 * whose spec has already consumed its validation window are skipped (deduped),
 * never thrown. Returns all records + the ranked survivors.
 */
export async function runLab(
  candidates: Candidate[],
  candles: Candle[],
  opts: PipelineOptions
): Promise<LabResult> {
  const records: ExperimentRecord[] = [];
  for (const c of candidates) {
    try {
      records.push(await runPipelineFor(c.code, c.backtestable, candles, opts));
    } catch (err) {
      if (err instanceof Error && err.name === "ValidationAlreadyConsumedError") continue;
      throw err;
    }
  }

  const survivors = records
    .filter((r) => r.passed)
    .sort((a, b) => (b.oosMetrics?.totalReturnPct ?? 0) - (a.oosMetrics?.totalReturnPct ?? 0));

  return { records, survivors };
}
