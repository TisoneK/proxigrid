import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";
import { getResearchStore } from "@/lib/research/store/research-store";
import { runLab, strategyCandidate, featureCandidate, multiAssetCandidates, type Candidate } from "@/lib/research/lab/lab";
import { TREND_FILTER, type RegimeFilter } from "@/lib/research/engine/backtester";
import {
  generateMaGrid,
  generateRsiGrid,
  generateBollingerGrid,
  generateDonchianGrid,
  type MaGridRanges,
  type RsiGridRanges,
  type BollingerGridRanges,
  type DonchianGridRanges,
} from "@/lib/research/hypothesis/generator";
import { generateFeatureHypotheses, type FeatureGridSpec } from "@/lib/research/hypothesis/feature-generator";
import { defaultRegistry } from "@/lib/research/features/registry";
import "@/lib/research/features/builtins"; // registers builtins into defaultRegistry (self-guarded)
import { saveCandles, loadCandles } from "@/lib/research/data/history-store";
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
      symbols,
      timeframe = "1h",
      candles: candleCount = 1000,
      maGrid,
      rsiGrid,
      bollingerGrid,
      donchianGrid,
      featureGrids,
      validationFraction,
      embargoBars,
      refreshHistory = false,
    } = (body ?? {}) as {
      exchange?: string;
      /** Single-asset shorthand. */
      symbol?: string;
      /** Multi-asset run: every candidate runs per asset (§8 single-asset check). */
      symbols?: string[];
      timeframe?: string;
      candles?: number;
      maGrid?: MaGridRanges;
      rsiGrid?: RsiGridRanges;
      bollingerGrid?: BollingerGridRanges;
      donchianGrid?: DonchianGridRanges;
      featureGrids?: FeatureGridSpec[];
      validationFraction?: number;
      embargoBars?: number;
      refreshHistory?: boolean;
    };

    const assets = (symbols?.length ? symbols : [symbol])
      .map((s) => String(s).trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5);
    if (!assets.length) {
      return NextResponse.json({ error: "symbol or symbols required" }, { status: 400 });
    }
    const limit = intParam(String(Math.min(Math.max(candleCount ?? 1000, 100), 1000)), 1000, 100, 1000);

    // Per-asset candles, history-first (deterministic across runs, §2 data/):
    // fall back to a live fetch when the store can't supply enough bars, and
    // backfill so the next run is stored. refreshHistory=true forces live.
    const candlesByAsset = new Map<string, Candle[]>();
    const assetErrors: Record<string, string> = {};
    let livedAssets = 0;
    for (const asset of assets) {
      let candles: Candle[] = [];
      if (!refreshHistory) {
        try {
          candles = await loadCandles(exchange, asset, timeframe, limit);
        } catch {
          /* store unavailable — live fetch below */
        }
      }
      if (candles.length < limit) {
        try {
          livedAssets += 1;
          candles = await getMarketDataService().getCandles(exchange, asset, "1h", limit);
          try {
            await saveCandles(exchange, asset, timeframe, candles);
          } catch {
            /* store unavailable — research still runs on live data */
          }
        } catch (e) {
          // One unreachable asset must not abort the whole run — skip it and
          // report why; the rest of the assets still produce records.
          assetErrors[asset] = (e as Error).message;
          continue;
        }
      }
      if (candles.length >= 120) candlesByAsset.set(asset, candles);
      else assetErrors[asset] = `only ${candles.length} candles (< 120)`;
    }
    const usable = [...candlesByAsset.keys()];
    if (!usable.length) {
      return NextResponse.json(
        { error: `No asset supplied >=120 candles`, assetErrors },
        { status: 400 }
      );
    }

    // Default grids keep a bare POST useful: sweeps across all four named
    // strategy families (Donchian swept over entry-regime filters, §6) plus a
    // feature-threshold sweep over the registry.
    const ma = maGrid ?? { fastMA: [5, 7, 10], slowMA: [20, 30, 50] };
    const rsi = rsiGrid ?? { rsiPeriod: [14], oversold: [25, 30], overbought: [70, 75] };
    const bb = bollingerGrid ?? { bbPeriod: [20], bbStdDev: [2, 2.5] };
    const donchian = donchianGrid ?? {
      donchianPeriod: [20, 55],
      regimeFilters: ["any", TREND_FILTER] as RegimeFilter[],
    };
    const feats = featureGrids ?? [
      { feature: "rsi_14", lowers: [25, 30], uppers: [65, 70] },
      { feature: "bollinger_pctb", lowers: [0.05], uppers: [0.95], mode: "momentum" as const },
    ].filter((s) => defaultRegistry.has(s.feature));

    const base: Candidate[] = [
      ...generateMaGrid(ma).map(strategyCandidate),
      ...generateRsiGrid(rsi).map(strategyCandidate),
      ...generateBollingerGrid(bb).map(strategyCandidate),
      ...generateDonchianGrid(donchian).map(strategyCandidate),
      ...generateFeatureHypotheses(feats).map((g) => featureCandidate(g, defaultRegistry)),
    ];
    // Expand across assets — each (candidate, asset) pair is its own lineage.
    const candidates = multiAssetCandidates(base, usable);

    const store = getResearchStore();
    const { records, survivors } = await runLab(candidates, candlesByAsset, {
      ledger: store.validationLedger,
      split: {
        validationFraction: validationFraction ?? 0.3,
        embargoBars: embargoBars ?? 0,
      },
    });

    // Regime context per asset (spec §6): lets the UI ask "was the window
    // mostly trending?" before trusting the aggregate numbers.
    const regimeByAsset: Record<string, Record<Regime, number>> = {};
    for (const asset of usable) {
      regimeByAsset[asset] = countRegimes(candlesByAsset.get(asset)!);
    }

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
            // The candidate code carries the asset suffix (`CODE·ASSET`).
            assets: [rec.code.includes("·") ? rec.code.split("·")[1] : rec.code],
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
      assets: usable,
      candlesLiveFetched: livedAssets,
      candles: limit,
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
      regimeDistribution: regimeByAsset,
      assetErrors: Object.keys(assetErrors).length ? assetErrors : undefined,
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
