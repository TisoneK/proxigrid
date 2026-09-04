/**
 * Proxigrid Research Engine — Paper trader (docs/RESEARCH-ENGINE.md §10)
 *
 * Forward testing: observe real-time candles and simulate trades without risking
 * capital, bridging historical performance and real-world performance. A strategy
 * that backtests well but fails forward should be investigated, not deployed.
 *
 * Implemented as a thin online wrapper over the cost-aware backtester, so paper
 * results are, by construction, consistent with the research backtest over the
 * same candles (no second, subtly-different execution model to drift out of sync).
 * Feed it candles as they close; ask it for its running position/equity/metrics.
 */

import { runResearchBacktest, type StrategyParams, type BacktestConfig } from "../engine/backtester";
import type { MetricSet } from "../engine/metrics";
import type { Candle } from "@/lib/exchanges/types";

export interface PaperState {
  bars: number;
  position: number; // latest target position sign (−1/0/+1)
  equity: number; // net, starts at 1
  trades: number; // completed round-trips so far
  metrics: MetricSet;
}

export class PaperTrader {
  private readonly candles: Candle[] = [];

  constructor(
    private readonly params: StrategyParams,
    private readonly config: Partial<BacktestConfig> = {}
  ) {}

  /** Ingest one freshly-closed candle. */
  push(candle: Candle): void {
    this.candles.push(candle);
  }

  /** Ingest a batch (e.g. backfill before going live). */
  pushAll(candles: Candle[]): void {
    for (const c of candles) this.candles.push(c);
  }

  get barCount(): number {
    return this.candles.length;
  }

  /** Current forward-test state, recomputed from the accumulated candles. */
  state(): PaperState {
    const r = runResearchBacktest(this.candles, this.params, this.config);
    return {
      bars: this.candles.length,
      position: r.targets.length > 0 ? Math.sign(r.targets[r.targets.length - 1]) : 0,
      equity: r.equity.length > 0 ? r.equity[r.equity.length - 1] : 1,
      trades: r.metrics.trades,
      metrics: r.metrics,
    };
  }
}
