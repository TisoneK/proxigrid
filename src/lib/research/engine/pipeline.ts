/**
 * Proxigrid Research Engine — The Pipeline (docs/RESEARCH-ENGINE.md §8)
 *
 * Runs one hypothesis through the full gauntlet, short-circuiting on the first
 * failure, and produces an Experiment record:
 *
 *   split() → Scientist(research) → Critic(research) → OOS validation (ONCE)
 *
 * The validation window is scored at most once per spec (§9), enforced by the
 * ValidationLedger. The record it returns maps directly onto the Experiment
 * Prisma model from step 5 (see toExperimentRow()).
 */

import {
  runResearchBacktest,
  DEFAULT_COSTS,
  type BacktestConfig,
  type CostModel,
} from "./backtester";
import type { MetricSet } from "./metrics";
import { evaluate, type ScientistReport, type ScientistThresholds } from "./scientist";
import { criticize, type CriticReport, type CriticOptions } from "./critic";
import {
  splitDataset,
  specHash,
  scoreOnValidationOnce,
  type ValidationLedger,
  type SplitOptions,
} from "../data/dataset";
import { strategySpec, type StrategyHypothesis } from "../hypothesis/hypothesis";
import type { Candle } from "@/lib/exchanges/types";

export type PipelineStage = "scientist" | "critic" | "validation";

export interface ExperimentRecord {
  code: string;
  specHash: string;
  passed: boolean;
  failedStage?: PipelineStage; // set when passed === false
  window: {
    researchRange: { from: number; to: number };
    validationRange: { from: number; to: number };
    validationFraction: number;
    embargoBars: number;
  };
  costs: CostModel;
  scientist: ScientistReport;
  critic?: CriticReport; // absent if it failed at the scientist stage
  oosMetrics?: MetricSet; // absent unless it reached validation
}

export interface PipelineOptions {
  ledger: ValidationLedger;
  config?: Partial<BacktestConfig>;
  split?: SplitOptions;
  thresholds?: Partial<ScientistThresholds>;
  critic?: CriticOptions;
}

/**
 * Run a strategy hypothesis end to end. Returns a record whether it passes or
 * fails (failure carries the stage + the reports that explain why). The OOS
 * step throws ValidationAlreadyConsumedError if this exact spec has been
 * validated before — that is the point (§9), so callers that expect to re-run
 * should catch it deliberately.
 */
export async function runPipeline(
  hypothesis: StrategyHypothesis,
  candles: Candle[],
  opts: PipelineOptions
): Promise<ExperimentRecord> {
  const spec = strategySpec(hypothesis);
  const hash = specHash(spec);
  const split = splitDataset(candles, opts.split);
  const costs = opts.config?.costs ?? DEFAULT_COSTS;

  const window = {
    researchRange: split.researchRange,
    validationRange: split.validationRange,
    validationFraction: split.validationFraction,
    embargoBars: split.embargoBars,
  };

  // Stage 1 — Scientist (metrics + robustness) on the research window only.
  const scientist = evaluate(split.research, hypothesis.params, opts.config, opts.thresholds);
  if (!scientist.passed) {
    return { code: hypothesis.code, specHash: hash, passed: false, failedStage: "scientist", window, costs, scientist };
  }

  // Stage 2 — Critic (falsification) on the research window only.
  const critic = criticize(split.research, hypothesis.params, opts.config, opts.critic);
  if (!critic.passed) {
    return { code: hypothesis.code, specHash: hash, passed: false, failedStage: "critic", window, costs, scientist, critic };
  }

  // Stage 3 — Out-of-sample, scored exactly ONCE per spec.
  const { result: oosMetrics } = await scoreOnValidationOnce(
    opts.ledger,
    spec,
    split.validation,
    (v) => runResearchBacktest(v, hypothesis.params, opts.config).metrics
  );

  const passed = oosMetrics.totalReturnPct > 0 && oosMetrics.expectancy > 0;
  return {
    code: hypothesis.code,
    specHash: hash,
    passed,
    failedStage: passed ? undefined : "validation",
    window,
    costs,
    scientist,
    critic,
    oosMetrics,
  };
}

/**
 * Run a batch of hypotheses, collecting records. Hypotheses whose OOS window is
 * already consumed for their spec are skipped (deduped), not thrown.
 */
export async function runPipelineBatch(
  hypotheses: StrategyHypothesis[],
  candles: Candle[],
  opts: PipelineOptions
): Promise<ExperimentRecord[]> {
  const records: ExperimentRecord[] = [];
  for (const h of hypotheses) {
    try {
      records.push(await runPipeline(h, candles, opts));
    } catch (err) {
      if (err instanceof Error && err.name === "ValidationAlreadyConsumedError") continue;
      throw err;
    }
  }
  return records;
}

/** Shape an ExperimentRecord for the Experiment Prisma model (step 5). */
export function toExperimentRow(rec: ExperimentRecord, strategyId: string) {
  return {
    strategyId,
    kind: rec.oosMetrics ? "oos" : "backtest",
    window: rec.window,
    costs: rec.costs,
    metrics: rec.oosMetrics ?? rec.scientist.metrics,
    criticReport: rec.critic ?? { passed: false, checks: [] },
    passed: rec.passed,
  };
}
