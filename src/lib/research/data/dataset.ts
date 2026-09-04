/**
 * Proxigrid Research Engine — Dataset split + out-of-sample guard
 *
 * The single most important safeguard in the whole engine (docs/RESEARCH-ENGINE.md
 * §9). The dominant failure mode of automated strategy discovery is *learning
 * the validation set*: an AI keeps tweaking a strategy, peeking at the final
 * validation numbers each time, until it fits that window by chance.
 *
 * Two primitives prevent that structurally, not by convention:
 *   1. splitDataset() — carves candles into a research window and a most-recent,
 *      contiguous, LOCKED validation window (with an optional embargo gap so no
 *      information leaks across the boundary).
 *   2. specHash() + a ValidationLedger — the validation window may be scored at
 *      most ONCE per hypothesis spec. Changing the spec changes its hash, which
 *      means it is a *different* strategy (a new PXG-### lineage) — you don't get
 *      to re-run OOS on a tweaked strategy and keep the old result.
 *
 * Pure and storage-agnostic: the ledger is an interface so an in-memory instance
 * works in tests today and a Prisma-backed one (Experiment rows keyed by spec
 * hash) drops in at step 5 with no change here.
 */

import { createHash } from "node:crypto";
import type { Candle } from "@/lib/exchanges/types";

export interface SplitOptions {
  /** Fraction of the data reserved as the locked validation window (0..1). */
  validationFraction?: number;
  /**
   * Bars dropped BETWEEN research and validation so a strategy trained on the
   * research tail cannot "see into" the first validation bar through indicator
   * warmup or autocorrelation. Prevents boundary leakage.
   */
  embargoBars?: number;
}

export interface DatasetSplit {
  research: Candle[];
  validation: Candle[];
  researchRange: { from: number; to: number }; // openTime bounds (ms)
  validationRange: { from: number; to: number };
  embargoBars: number;
  validationFraction: number;
}

const DEFAULT_SPLIT: Required<SplitOptions> = {
  validationFraction: 0.3,
  embargoBars: 0,
};

/**
 * Split candles chronologically into research + a locked validation tail.
 * Candles are assumed already sorted ascending by openTime.
 */
export function splitDataset(candles: Candle[], opts: SplitOptions = {}): DatasetSplit {
  const { validationFraction, embargoBars } = { ...DEFAULT_SPLIT, ...opts };
  if (validationFraction <= 0 || validationFraction >= 1) {
    throw new Error(`validationFraction must be strictly between 0 and 1 (got ${validationFraction})`);
  }
  const n = candles.length;
  const valCount = Math.floor(n * validationFraction);
  const valStart = n - valCount;
  const resEnd = Math.max(0, valStart - embargoBars); // research excludes the embargo gap

  const research = candles.slice(0, resEnd);
  const validation = candles.slice(valStart);

  const rangeOf = (arr: Candle[]) =>
    arr.length > 0
      ? { from: arr[0].openTime, to: arr[arr.length - 1].openTime }
      : { from: 0, to: 0 };

  return {
    research,
    validation,
    researchRange: rangeOf(research),
    validationRange: rangeOf(validation),
    embargoBars,
    validationFraction,
  };
}

// ---------------------------------------------------------------------------
// Spec hashing — a strategy's identity
// ---------------------------------------------------------------------------

/**
 * Deterministic hash of a hypothesis/strategy spec. Two specs that differ in
 * any meaningful value produce different hashes; key order and object nesting
 * do not matter (keys are canonicalized). This hash IS the strategy's identity
 * for out-of-sample accounting.
 */
export function specHash(spec: unknown): string {
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

/** JSON with object keys sorted recursively, so equal specs stringify equally. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

// ---------------------------------------------------------------------------
// The one-shot validation guard
// ---------------------------------------------------------------------------

export interface ValidationRecord {
  specHash: string;
  at: number; // ms epoch
  meta?: Record<string, unknown>;
}

/**
 * Records which spec hashes have already been scored on the validation window.
 * Implemented in-memory for tests; a Prisma-backed ledger (querying Experiment
 * rows of kind "oos" by spec hash) satisfies the same interface at step 5.
 */
export interface ValidationLedger {
  hasRun(specHash: string): Promise<boolean> | boolean;
  record(rec: ValidationRecord): Promise<void> | void;
}

export class InMemoryValidationLedger implements ValidationLedger {
  private readonly seen = new Map<string, ValidationRecord>();

  hasRun(hash: string): boolean {
    return this.seen.has(hash);
  }

  record(rec: ValidationRecord): void {
    this.seen.set(rec.specHash, rec);
  }

  /** Test/introspection helper. */
  get size(): number {
    return this.seen.size;
  }
}

/** Thrown when a spec's single validation run has already been consumed. */
export class ValidationAlreadyConsumedError extends Error {
  constructor(public readonly specHash: string) {
    super(
      `Out-of-sample validation for this spec has already been run (hash ${specHash.slice(0, 12)}…). ` +
        `Modifying a strategy after seeing its validation result and re-scoring it is how you overfit the ` +
        `validation set. Treat the changed strategy as a NEW spec (new PXG-### lineage) instead.`
    );
    this.name = "ValidationAlreadyConsumedError";
  }
}

/**
 * Run `score` against the validation window AT MOST ONCE for a given spec.
 * The first call executes and records; any later call for the same spec throws.
 * This is the structural enforcement of §9 — the AI never gets to iterate on the
 * validation set.
 */
export async function scoreOnValidationOnce<T>(
  ledger: ValidationLedger,
  spec: unknown,
  validation: Candle[],
  score: (validation: Candle[]) => T | Promise<T>
): Promise<{ result: T; specHash: string }> {
  const hash = specHash(spec);
  if (await ledger.hasRun(hash)) {
    throw new ValidationAlreadyConsumedError(hash);
  }
  const result = await score(validation);
  await ledger.record({ specHash: hash, at: Date.now() });
  return { result, specHash: hash };
}
