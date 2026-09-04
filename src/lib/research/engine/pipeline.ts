/**
 * Proxigrid Research Engine — The Pipeline (docs/RESEARCH-ENGINE.md §8)
 *
 * Runs one strategy (named OR feature-driven, via Backtestable) through the full
 * gauntlet, short-circuiting on the first failure, and produces an Experiment
 * record:
 *
 *   split() → Scientist(research) → Critic(research) → OOS validation (ONCE)
 *
 * The validation window is scored at most once per spec (§9), enforced by the
 * ValidationLedger. The record maps onto the Experiment Prisma model (step 5).
 */

import {
  simulate,
  DEFAULT_COSTS,
  type BacktestConfig,
  type CostModel,
} from "./backtester";
import { fromStrategy, type Backtestable } from "./backtestable";
import type { MetricSet } from "./metrics";
import { evaluateBacktestable, type ScientistReport, type ScientistThresholds } from "./scientist";
import { criticizeBacktestable, type CriticReport, type CriticOptions } from "./critic";
import {
  splitDataset,
  specHash,
  scoreOnValidationOnce,
  type ValidationLedger,
  type SplitOptions,
} from "../data/dataset";
import { type StrategyHypothesis } from "../hypothesis/hypothesis";
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
 * Run any Backtestable end to end. `code` labels the resulting record. Returns a
 * record whether it passes or fails (failure carries the stage + the reports).
 * The OOS step throws ValidationAlreadyConsumedError if this exact spec has been
 * validated before — that is the point (§9).
 */
export async function runPipelineFor(
  code: string,
  b: Backtestable,
  candles: Candle[],
  opts: PipelineOptions
): Promise<ExperimentRecord> {
  const spec = b.spec;
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
  const scientist = evaluateBacktestable(split.research, b, opts.config, opts.thresholds);
  if (!scientist.passed) {
    return { code, specHash: hash, passed: false, failedStage: "scientist", window, costs, scientist };
  }

  // Stage 2 — Critic (falsification) on the research window only.
  const critic = criticizeBacktestable(split.research, b, opts.config, opts.critic);
  if (!critic.passed) {
    return { code, specHash: hash, passed: false, failedStage: "critic", window, costs, scientist, critic };
  }

  // Stage 3 — Out-of-sample, scored exactly ONCE per spec.
  const { result: oosMetrics } = await scoreOnValidationOnce(
    opts.ledger,
    spec,
    split.validation,
    (v) => simulate(v, b.signals(v), opts.config ?? {}).metrics
  );

  const passed = oosMetrics.totalReturnPct > 0 && oosMetrics.expectancy > 0;
  return {
    code,
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

/** Run a named-strategy hypothesis (thin wrapper over runPipelineFor). */
export function runPipeline(
  hypothesis: StrategyHypothesis,
  candles: Candle[],
  opts: PipelineOptions
): Promise<ExperimentRecord> {
  return runPipelineFor(hypothesis.code, fromStrategy(hypothesis.params), candles, opts);
}

/**
 * Run a batch of named-strategy hypotheses, collecting records. Hypotheses whose
 * OOS window is already consumed for their spec are skipped (deduped), not thrown.
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
