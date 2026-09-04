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
import { fromStrategy, fromHypothesis, withAssetTag, type Backtestable } from "../engine/backtestable";
import type { StrategyHypothesis } from "../hypothesis/hypothesis";
import type { GeneratedHypothesis } from "../hypothesis/feature-generator";
import type { FeatureRegistry } from "../features/registry";
import type { Candle } from "@/lib/exchanges/types";

export interface Candidate {
  code: string;
  backtestable: Backtestable;
  /** Asset this candidate runs on — REQUIRED from runLab's perspective; set
   *  by multiAssetCandidates. Kept optional here for back-compat with callers
   *  that construct bare candidates for single-asset runs. */
  asset?: string;
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
 * Expand candidates across assets: each (candidate, asset) pair becomes its
 * own lineage — the asset is tagged into the spec so the OOS ledger hashes
 * them separately, and codes carry the asset suffix for display.
 */
export function multiAssetCandidates(candidates: Candidate[], assets: string[]): Candidate[] {
  const out: Candidate[] = [];
  for (const c of candidates) {
    for (const asset of assets) {
      out.push({
        code: `${c.code}·${asset}`,
        backtestable: withAssetTag(c.backtestable, asset),
        asset,
      });
    }
  }
  return out;
}

/**
 * Run every candidate through the pipeline over its OWN candle set — a single
 * array when candidates carry no per-asset data (legacy single-asset), or the
 * candidate's asset's candles when the caller supplies multi-asset candles.
 * Candidates whose spec has already consumed its validation window are skipped
 * (deduped), never thrown. Returns all records + the ranked survivors.
 */
export async function runLab(
  candidates: Candidate[],
  candlesByAsset: Candle[] | Map<string, Candle[]>,
  opts: PipelineOptions
): Promise<LabResult> {
  const records: ExperimentRecord[] = [];
  for (const c of candidates) {
    const asset = c.asset;
    let candles: Candle[];
    if (candlesByAsset instanceof Map) {
      if (!asset) throw new Error("multi-asset run requires every candidate to carry an asset");
      candles = candlesByAsset.get(asset) ?? [];
    } else {
      candles = candlesByAsset;
    }
    if (!candles.length) continue;
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
