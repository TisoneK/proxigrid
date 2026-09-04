/**
 * Proxigrid Research Engine — Prisma persistence (the deferred step-5 store)
 *
 * Two pieces, both speaking the interfaces the pure engine already defines:
 *
 *  1. PrismaValidationLedger — the §9 one-shot OOS guard, durable. A spec hash
 *     that has ever been scored on a validation window is recorded as an
 *     Experiment(kind="oos"); the ledger consults those rows, so the guard
 *     survives restarts (unlike the in-memory ledger, which resets every boot
 *     and would let a re-deployed lab re-score the same spec).
 *
 *  2. ResearchStore — creates Strategy rows (PXG-### codes), records
 *     Experiments, and moves strategies through the lifecycle state machine
 *     with the evidentiary guards (→ PAPER needs a passing OOS experiment).
 */

import { db } from "@/lib/db";
import type { ValidationLedger, ValidationRecord } from "../data/dataset";
import type { ExperimentRecord } from "../engine/pipeline";
import { toExperimentRow } from "../engine/pipeline";
import type { StrategyStatus } from "../lifecycle/state-machine";
import { canTransition, transition, canPromoteToPaper } from "../lifecycle/state-machine";

/**
 * Durable one-shot validation guard: an Experiment row of kind "oos" IS the
 * record that this spec was scored. The specHash is stored inside the JSON
 * `window` column (the Experiment model has no dedicated column for it), so
 * lookups filter on `window` containing the hash.
 */
export class PrismaValidationLedger implements ValidationLedger {
  async hasRun(specHash: string): Promise<boolean> {
    const count = await db.experiment.count({
      where: { kind: "oos", window: { path: ["specHash"], equals: specHash } },
    });
    return count > 0;
  }

  async record(rec: ValidationRecord): Promise<void> {
    // The pipeline writes the full Experiment row (including window.specHash)
    // through the ResearchStore immediately after scoring. The ledger only
    // needs to record standalone hashes when a caller scores validation
    // outside the pipeline; upsert keeps that idempotent.
    const existing = await db.experiment.findFirst({
      where: { kind: "oos", window: { path: ["specHash"], equals: rec.specHash } },
      select: { id: true },
    });
    if (existing) return;
    // Placeholder row with no strategyId is not possible (required relation),
    // so a bare ledger record is attached to a sentinel strategy.
    const sentinel = await sentinelStrategy();
    await db.experiment.create({
      data: {
        strategyId: sentinel.id,
        kind: "oos",
        window: { specHash: rec.specHash, at: rec.at, note: "ledger-only record" },
        costs: {},
        metrics: {},
        criticReport: { passed: false, checks: [] },
        passed: false,
      },
    });
  }
}

let _sentinel: { id: string } | null = null;
async function sentinelStrategy(): Promise<{ id: string }> {
  if (_sentinel) return _sentinel;
  const found = await db.strategy.upsert({
    where: { code: "PXG-000" },
    create: {
      code: "PXG-000",
      title: "Validation ledger sentinel",
      hypothesis: "Holder for OOS ledger records scored outside a strategy run.",
      status: "RETIRED",
      spec: {},
      assets: [],
      timeframe: "1h",
      allocation: 0,
    },
    update: {},
    select: { id: true },
  });
  _sentinel = found;
  return found;
}

// ---------------------------------------------------------------------------
// ResearchStore — Strategy + Experiment persistence
// ---------------------------------------------------------------------------

export interface CreateStrategyInput {
  title: string;
  hypothesis: string;
  spec: Record<string, unknown>;
  assets: string[];
  timeframe: string;
  regime?: string;
}

export class ResearchStore {
  private ledger: PrismaValidationLedger;

  constructor() {
    this.ledger = new PrismaValidationLedger();
  }

  get validationLedger(): ValidationLedger {
    return this.ledger;
  }

  /** Next PXG-### code (max existing numeric suffix + 1). */
  private async nextCode(): Promise<string> {
    const rows = await db.strategy.findMany({
      where: { code: { startsWith: "PXG-" } },
      select: { code: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = Number.parseInt(r.code.slice(4), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `PXG-${String(max + 1).padStart(3, "0")}`;
  }

  async createStrategy(input: CreateStrategyInput) {
    return db.strategy.create({
      data: {
        code: await this.nextCode(),
        title: input.title,
        hypothesis: input.hypothesis,
        status: "RESEARCH",
        spec: input.spec as object,
        assets: input.assets,
        timeframe: input.timeframe,
        regime: input.regime ?? null,
      },
    });
  }

  listStrategies(status?: string) {
    return db.strategy.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { experiments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
  }

  getStrategy(id: string) {
    return db.strategy.findUnique({
      where: { id },
      include: { experiments: { orderBy: { createdAt: "desc" } } },
    });
  }

  /** Record one pipeline result against a strategy. The specHash rides in the
   *  window JSON so the ledger (and any future audit) can find it. */
  async recordExperiment(rec: ExperimentRecord, strategyId: string) {
    const row = toExperimentRow(rec, strategyId);
    return db.experiment.create({
      data: {
        ...row,
        kind: row.kind,
        window: { ...(row.window as object), specHash: rec.specHash },
        costs: JSON.parse(JSON.stringify(row.costs)),
        metrics: JSON.parse(JSON.stringify(row.metrics)),
        criticReport: JSON.parse(JSON.stringify(row.criticReport)),
      },
    });
  }

  /** Lifecycle transition with the state machine + evidentiary guards. */
  async transitionStrategy(id: string, to: StrategyStatus) {
    const strategy = await db.strategy.findUnique({ where: { id } });
    if (!strategy) throw new Error(`Strategy ${id} not found`);
    const from = strategy.status as StrategyStatus;
    if (!canTransition(from, to)) {
      throw new Error(illegalMsg(from, to));
    }
    if (to === "PAPER" && !canPromoteToPaper(await this.hasPassingOos(id))) {
      throw new Error("→ PAPER requires a passing out-of-sample experiment (spec §10).");
    }
    const next = transition(from, to);
    return db.strategy.update({ where: { id }, data: { status: next } });
  }

  private async hasPassingOos(strategyId: string): Promise<boolean> {
    const count = await db.experiment.count({
      where: { strategyId, kind: "oos", passed: true },
    });
    return count > 0;
  }
}

function illegalMsg(from: StrategyStatus, to: StrategyStatus): string {
  return `Illegal strategy transition: ${from} → ${to}. Use a legal edge per the lifecycle state machine.`;
}

// Singleton
let _store: ResearchStore | null = null;
export function getResearchStore(): ResearchStore {
  if (!_store) _store = new ResearchStore();
  return _store;
}
