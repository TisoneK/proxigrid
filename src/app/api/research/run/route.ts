import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";
import { getResearchStore } from "@/lib/research/store/research-store";
import { runLab, strategyCandidate, featureCandidate, type Candidate } from "@/lib/research/lab/lab";
import { generateMaGrid, generateRsiGrid, type MaGridRanges, type RsiGridRanges } from "@/lib/research/hypothesis/generator";
import { generateFeatureHypotheses, type FeatureGridSpec } from "@/lib/research/hypothesis/feature-generator";
import { defaultRegistry } from "@/lib/research/features/registry";
import "@/lib/research/features/builtins"; // registers builtins into defaultRegistry (self-guarded)
import { intParam } from "@/lib/params";
import { detectRegimes, REGIMES, type Regime } from "@/lib/research/regime/detector";
import type { Candle } from "@/lib/exchanges/types";
import type { ExperimentRecord } from "@/lib/research/engine/pipeline";

export const maxDuration = 60; // research runs are bounded by the fetch + grid size

/**
 * POST /api/research/run — one lab pass.
 *
 * Body:
 * {
 *   exchange?: "binance", symbol?: "BTCUSDT", timeframe?: "1h", candles?: 500,
 *   maGrid?: MaGridRanges, rsiGrid?: RsiGridRanges, featureGrids?: FeatureGridSpec[],
 *   validationFraction?: number, embargoBars?: number
 * }
 *
 * Fetches live candles, builds grid candidates (named strategies + feature
 * hypotheses), runs each through the full pipeline (split → scientist → critic
 * → one-shot OOS), persists every strategy + experiment, and returns the
 * records with the ranked survivors.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      exchange = "binance",
      symbol = "BTCUSDT",
      timeframe = "1h",
      candles: candleCount = 1000,
      maGrid,
      rsiGrid,
      featureGrids,
      validationFraction,
      embargoBars,
    } = (body ?? {}) as {
      exchange?: string;
      symbol?: string;
      timeframe?: string;
      candles?: number;
      maGrid?: MaGridRanges;
      rsiGrid?: RsiGridRanges;
      featureGrids?: FeatureGridSpec[];
      validationFraction?: number;
      embargoBars?: number;
    };

    const limit = intParam(String(Math.min(Math.max(candleCount ?? 500, 100), 1000)), 500, 100, 1000);
    const data = await getMarketDataService().getCandles(exchange, symbol, "1h", limit);
    if (data.length < 120) {
      return NextResponse.json(
        { error: `Need at least 120 candles for a research split (got ${data.length})` },
        { status: 400 }
      );
    }
    const candles: Candle[] = data;

    // Default grids keep a bare POST useful: a small MA sweep + RSI(14) band sweep.
    const ma = maGrid ?? { fastMA: [5, 7, 10], slowMA: [20, 30, 50] };
    const rsi = rsiGrid ?? { rsiPeriod: [14], oversold: [25, 30], overbought: [70, 75] };
    const feats = featureGrids ?? [
      { feature: "rsi_14", lowers: [25, 30], uppers: [65, 70] },
      { feature: "bollinger_pctb", lowers: [0.05], uppers: [0.95], mode: "momentum" as const },
    ].filter((s) => defaultRegistry.has(s.feature));

    const candidates: Candidate[] = [
      ...generateMaGrid(ma).map(strategyCandidate),
      ...generateRsiGrid(rsi).map(strategyCandidate),
      ...generateFeatureHypotheses(feats).map((g) => featureCandidate(g, defaultRegistry)),
    ];

    const store = getResearchStore();
    const { records, survivors } = await runLab(candidates, candles, {
      ledger: store.validationLedger,
      split: {
        validationFraction: validationFraction ?? 0.3,
        embargoBars: embargoBars ?? 0,
      },
    });

    // Regime context for this dataset (spec §6): lets the UI ask "was the
    // window mostly trending?" before trusting the aggregate numbers.
    const regimeCounts = countRegimes(candles);

    // Persist: one Strategy per distinct spec (§9 — the specHash IS the
    // lineage identity; a changed spec earns a new PXG-### code), one
    // Experiment per record.
    const byHash = new Map<string, string>(); // specHash -> strategyId
    const persisted: { id: string; strategyId: string }[] = [];
    for (const rec of records) {
      let strategyId = byHash.get(rec.specHash);
      if (!strategyId) {
        const existing = await dbFindStrategyBySpecHash(rec.specHash);
        if (existing) {
          strategyId = existing.id;
        } else {
          const created = await store.createStrategy({
            title: strategyTitle(rec),
            hypothesis: `Lab candidate ${rec.code} (spec ${rec.specHash.slice(0, 12)})`,
            spec: { labCode: rec.code, specHash: rec.specHash },
            assets: [symbol],
            timeframe,
          });
          strategyId = created.id;
        }
        byHash.set(rec.specHash, strategyId);
      }
      const row = await store.recordExperiment(rec, strategyId);
      persisted.push({ id: row.id, strategyId });
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      records: records.map((r) => ({
        code: r.code,
        passed: r.passed,
        failedStage: r.failedStage ?? null,
        specHash: r.specHash.slice(0, 12),
        researchMetrics: r.scientist.metrics,
        oosMetrics: r.oosMetrics ?? null,
        criticChecks: r.critic?.checks.map((c) => ({ name: c.name, passed: c.passed })) ?? null,
      })),
      survivors: survivors.map((r) => r.code),
      strategyIds: Object.fromEntries(byHash),
      persistedRows: persisted.length,
      regimeDistribution: regimeCounts,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Per-regime bar counts over a candle array (detector defaults). */
function countRegimes(candles: Candle[]): Record<Regime, number> {
  const labels = detectRegimes(candles);
  const counts = Object.fromEntries(REGIMES.map((r) => [r, 0])) as Record<Regime, number>;
  for (const label of labels) counts[label] += 1;
  return counts;
}

async function dbFindStrategyBySpecHash(specHash: string): Promise<{ id: string } | null> {
  const { db } = await import("@/lib/db");
  return db.strategy.findFirst({
    where: { spec: { path: ["specHash"], equals: specHash } },
    select: { id: true },
  });
}

function strategyTitle(rec: ExperimentRecord): string {
  const kind = rec.code.startsWith("FEAT-") ? "feature" : "grid";
  return `${rec.code} · ${kind} spec ${rec.specHash.slice(0, 8)}`;
}
