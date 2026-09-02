/**
 * Proxigrid — IntelligenceService
 *
 * Generates trading signals by computing indicators on candle data and
 * applying simple interpretive rules. Signals are persisted via Prisma.
 *
 * Adding a new signal type = add an entry to SIGNAL_GENERATORS and a generator fn.
 */

import { db } from "../db";
import { getMarketDataService } from "./market-data-service";
import type { Candle, CandleInterval } from "../exchanges/types";
import {
  bollingerBands,
  ema,
  lastNonNull,
  macd,
  rsi,
  sma,
} from "../indicators";
import type { BaseCondition, RuleContext } from "../rules/conditions";

export interface SignalDraft {
  exchangeCode: string;
  symbol: string;
  timeframe: string;
  indicator: string;
  direction: "long" | "short" | "neutral";
  strength: number; // 0..1
  price: number;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface EnrichedSignal extends SignalDraft {
  id: string;
  createdAt: Date;
}

export type SignalGenerator = (
  candles: Candle[],
  ctx: { exchangeCode: string; symbol: string; timeframe: string }
) => SignalDraft | null;

// ===========================================================================
// Signal generators
// ===========================================================================

const rsiSignal: SignalGenerator = (candles, ctx) => {
  const period = 14;
  const series = rsi(candles, period);
  const last = lastNonNull(series);
  if (last === null) return null;

  let direction: "long" | "short" | "neutral" = "neutral";
  let strength = 0.5;

  if (last < 30) {
    direction = "long";
    strength = (30 - last) / 30; // deeper oversold = stronger
  } else if (last > 70) {
    direction = "short";
    strength = (last - 70) / 30;
  } else {
    // mid-range, weaker signal
    if (last < 45) {
      direction = "long";
      strength = (45 - last) / 45 * 0.5;
    } else if (last > 55) {
      direction = "short";
      strength = (last - 55) / 45 * 0.5;
    }
  }

  return {
    exchangeCode: ctx.exchangeCode,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    indicator: "RSI",
    direction,
    strength: Math.min(1, Math.max(0, strength)),
    price: candles[candles.length - 1].close,
    note: `RSI(${period}) = ${last.toFixed(2)}`,
    metadata: { rsi: last, period },
  };
};

const macdSignal: SignalGenerator = (candles, ctx) => {
  const { macd: macdLine, signal, histogram } = macd(candles, 12, 26, 9);
  const lastHist = lastNonNull(histogram);
  const lastMacd = lastNonNull(macdLine);
  const lastSignal = lastNonNull(signal);
  if (lastHist === null || lastMacd === null || lastSignal === null) return null;

  let direction: "long" | "short" | "neutral" = "neutral";
  let strength = 0.5;

  if (lastHist > 0 && lastMacd > lastSignal) {
    direction = "long";
    strength = Math.min(1, Math.abs(lastHist) / (Math.abs(lastMacd) + 1e-9));
  } else if (lastHist < 0 && lastMacd < lastSignal) {
    direction = "short";
    strength = Math.min(1, Math.abs(lastHist) / (Math.abs(lastMacd) + 1e-9));
  }

  return {
    exchangeCode: ctx.exchangeCode,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    indicator: "MACD",
    direction,
    strength,
    price: candles[candles.length - 1].close,
    note: `MACD hist=${lastHist.toFixed(4)} macd=${lastMacd.toFixed(4)} signal=${lastSignal.toFixed(4)}`,
    metadata: { macd: lastMacd, signal: lastSignal, histogram: lastHist },
  };
};

const emaCrossSignal: SignalGenerator = (candles, ctx) => {
  const fast = ema(candles, 12);
  const slow = ema(candles, 26);
  if (fast.length < 2 || slow.length < 2) return null;

  const fastLast = fast[fast.length - 1];
  const fastPrev = fast[fast.length - 2];
  const slowLast = slow[slow.length - 1];
  const slowPrev = slow[slow.length - 2];
  if (
    fastLast === null ||
    fastPrev === null ||
    slowLast === null ||
    slowPrev === null
  ) {
    return null;
  }

  let direction: "long" | "short" | "neutral" = "neutral";
  let strength = 0.5;
  let note = "";

  if (fastPrev <= slowPrev && fastLast > slowLast) {
    direction = "long";
    strength = Math.min(1, (fastLast - slowLast) / slowLast * 100);
    note = "EMA(12) crossed above EMA(26) — bullish";
  } else if (fastPrev >= slowPrev && fastLast < slowLast) {
    direction = "short";
    strength = Math.min(1, (slowLast - fastLast) / slowLast * 100);
    note = "EMA(12) crossed below EMA(26) — bearish";
  } else if (fastLast > slowLast) {
    direction = "long";
    strength = 0.3;
    note = "EMA(12) above EMA(26) — uptrend";
  } else if (fastLast < slowLast) {
    direction = "short";
    strength = 0.3;
    note = "EMA(12) below EMA(26) — downtrend";
  }

  return {
    exchangeCode: ctx.exchangeCode,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    indicator: "EMA_CROSS",
    direction,
    strength,
    price: candles[candles.length - 1].close,
    note,
    metadata: { fast: fastLast, slow: slowLast },
  };
};

const bollingerSignal: SignalGenerator = (candles, ctx) => {
  const period = 20;
  const { middle, upper, lower } = bollingerBands(candles, period, 2);
  const last = candles[candles.length - 1];
  const upperLast = lastNonNull(upper);
  const lowerLast = lastNonNull(lower);
  const midLast = lastNonNull(middle);
  if (upperLast === null || lowerLast === null || midLast === null) return null;

  let direction: "long" | "short" | "neutral" = "neutral";
  let strength = 0.5;
  let note = "";

  if (last.close < lowerLast) {
    direction = "long";
    strength = Math.min(1, (lowerLast - last.close) / (midLast - lowerLast + 1e-9));
    note = `Price below lower BB — oversold`;
  } else if (last.close > upperLast) {
    direction = "short";
    strength = Math.min(1, (last.close - upperLast) / (upperLast - midLast + 1e-9));
    note = `Price above upper BB — overbought`;
  } else {
    direction = "neutral";
    strength = 0.2;
    note = "Price inside Bollinger band";
  }

  return {
    exchangeCode: ctx.exchangeCode,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    indicator: "BOLLINGER",
    direction,
    strength,
    price: last.close,
    note,
    metadata: { upper: upperLast, lower: lowerLast, middle: midLast },
  };
};

// Registry (exported for unit testing the pure generators)
export const SIGNAL_GENERATORS: Record<string, SignalGenerator> = {
  RSI: rsiSignal,
  MACD: macdSignal,
  EMA_CROSS: emaCrossSignal,
  BOLLINGER: bollingerSignal,
};

// ===========================================================================
// Service
// ===========================================================================

export class IntelligenceService {
  /**
   * Compute and persist signals for one symbol/timeframe across all
   * configured generators (or a single named one).
   */
  async generateAndPersist(
    exchangeCode: string,
    symbol: string,
    timeframe: CandleInterval = "1h",
    generators?: string[]
  ): Promise<EnrichedSignal[]> {
    const candles = await getMarketDataService().getCandles(
      exchangeCode,
      symbol,
      timeframe,
      200
    );
    if (!candles.length) return [];

    const ctx = { exchangeCode, symbol, timeframe };
    const gens = generators ?? Object.keys(SIGNAL_GENERATORS);
    const drafts: SignalDraft[] = [];

    for (const name of gens) {
      const gen = SIGNAL_GENERATORS[name];
      if (!gen) continue;
      const draft = gen(candles, ctx);
      if (draft) drafts.push(draft);
    }

    // Dedupe: only persist a signal when its direction *changed* from the most
    // recent stored one for the same (symbol, timeframe, indicator). The scanner
    // runs on a short interval and most ticks repeat the prior state — persisting
    // those would grow the table unbounded and re-alert on unchanged conditions.
    const fresh: SignalDraft[] = [];
    for (const d of drafts) {
      const last = await db.signal.findFirst({
        where: { symbol: d.symbol, timeframe: d.timeframe, indicator: d.indicator },
        orderBy: { createdAt: "desc" },
        select: { direction: true },
      });
      if (!last || last.direction !== d.direction) fresh.push(d);
    }

    // Persist
    const created = await Promise.all(
      fresh.map((d) =>
        db.signal.create({
          data: {
            exchangeCode: d.exchangeCode,
            symbol: d.symbol,
            timeframe: d.timeframe,
            indicator: d.indicator,
            direction: d.direction,
            strength: d.strength,
            price: d.price,
            note: d.note ?? null,
            metadata: JSON.stringify(d.metadata ?? {}),
          },
        })
      )
    );

    return created.map((c, i) => ({
      ...fresh[i],
      id: c.id,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Delete signals older than the retention window. Run periodically from the
   * scanner so the Signal table doesn't grow without bound.
   */
  async pruneOldSignals(
    retentionDays: number = Number(process.env.SIGNAL_RETENTION_DAYS ?? 7)
  ): Promise<number> {
    const days = Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { count } = await db.signal.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return count;
  }

  /**
   * Record outcome returns for directional signals once their horizon has
   * passed. Uses 1h candles regardless of the signal's own timeframe — the
   * horizons (1h/24h after creation) are absolute. Direction-adjusted, so a
   * positive value always means "market moved in the signal's favor":
   *   long  → (P_h - P_0) / P_0
   *   short → (P_0 - P_h) / P_0
   * Returns that can't be resolved yet stay null and are retried next tick;
   * signals older than the candle-fetch window are closed out as null.
   */
  async checkSignalOutcomes(): Promise<{ checked: number; resolved: number }> {
    const now = Date.now();
    // Anything older than 3 days can't be resolved from a 200×1h fetch window.
    const cutoff = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const pending = await db.signal.findMany({
      where: {
        direction: { in: ["long", "short"] },
        OR: [{ return1h: null }, { return24h: null }],
        createdAt: { gte: cutoff, lt: new Date(now - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    if (!pending.length) return { checked: 0, resolved: 0 };

    // One candle fetch per (exchange, symbol) group.
    const groups = new Map<string, typeof pending>();
    for (const s of pending) {
      const key = `${s.exchangeCode}:${s.symbol}`;
      const list = groups.get(key) ?? [];
      list.push(s);
      groups.set(key, list);
    }

    let resolved = 0;
    for (const [key, signals] of groups) {
      const [exchangeCode, symbol] = key.split(":");
      let candles: Candle[];
      try {
        candles = await getMarketDataService().getCandles(exchangeCode, symbol, "1h", 200);
      } catch (e) {
        console.warn(`[outcomes] ${key} candle fetch failed:`, (e as Error).message);
        continue;
      }
      for (const s of signals) {
        const data: { return1h?: number; return24h?: number } = {};
        for (const horizonMs of [60 * 60 * 1000, 24 * 60 * 60 * 1000]) {
          const field = horizonMs === 60 * 60 * 1000 ? "return1h" : "return24h";
          if (s[field] !== null) continue; // already recorded
          const target = new Date(s.createdAt).getTime() + horizonMs;
          if (target > now) continue; // horizon not reached yet
          // First 1h candle that closes at/after the horizon timestamp.
          const candle = candles.find((c) => c.closeTime >= target);
          if (!candle) {
            // Unresolvable from the fetch window (stale symbol/short history).
            data[field] = 0;
            continue;
          }
          const raw = (candle.close - s.price) / s.price;
          data[field] = s.direction === "short" ? -raw : raw;
        }
        if (Object.keys(data).length === 0) continue;
        await db.signal.update({ where: { id: s.id }, data });
        resolved += 1;
      }
    }
    return { checked: pending.length, resolved };
  }

  /**
   * Signal performance: hit-rate and average direction-adjusted return over
   * resolved signals in the window (default 7d), overall and split by
   * indicator. direction="neutral" signals are excluded — there's no
   * directional claim to grade.
   */
  async performance(days: number = 7) {
    const d = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;
    const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
    const resolved = await db.signal.findMany({
      where: {
        direction: { in: ["long", "short"] },
        createdAt: { gte: since },
        return1h: { not: null },
      },
      select: { indicator: true, direction: true, strength: true, return1h: true, return24h: true },
    });

    const summarize = (rows: typeof resolved) => {
      const hits1h = rows.filter((r) => (r.return1h ?? 0) > 0);
      const with24 = rows.filter((r) => r.return24h !== null);
      const hits24 = with24.filter((r) => (r.return24h ?? 0) > 0);
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      return {
        total: rows.length,
        hitRate1h: rows.length ? hits1h.length / rows.length : 0,
        avgReturn1h: avg(rows.map((r) => r.return1h ?? 0)),
        hitRate24h: with24.length ? hits24.length / with24.length : 0,
        avgReturn24h: avg(with24.map((r) => r.return24h ?? 0)),
      };
    };

    const byIndicator: Record<string, ReturnType<typeof summarize>> = {};
    for (const ind of new Set(resolved.map((r) => r.indicator))) {
      byIndicator[ind] = summarize(resolved.filter((r) => r.indicator === ind));
    }

    return { windowDays: d, ...summarize(resolved), byIndicator };
  }

  /**
   * Build a RuleContext (indicator values) for the rule engine, given the
   * latest candle set for a symbol.
   */
  async buildRuleContext(
    exchangeCode: string,
    symbol: string,
    timeframe: CandleInterval = "1h"
  ): Promise<RuleContext> {
    const candles = await getMarketDataService().getCandles(
      exchangeCode,
      symbol,
      timeframe,
      200
    );
    if (!candles.length) {
      throw new Error(`No candles for ${exchangeCode}:${symbol}:${timeframe}`);
    }

    const indicators: Record<string, (number | null)[]> = {};
    indicators["RSI_14"] = rsi(candles, 14);
    indicators["SMA_20"] = sma(candles, 20);
    indicators["SMA_50"] = sma(candles, 50);
    indicators["EMA_12"] = ema(candles, 12);
    indicators["EMA_26"] = ema(candles, 26);
    const macdResult = macd(candles);
    indicators["MACD_"] = macdResult.macd;
    indicators["MACD_SIGNAL_"] = macdResult.signal;
    const bb = bollingerBands(candles);
    indicators["BB_UPPER_20"] = bb.upper;
    indicators["BB_LOWER_20"] = bb.lower;
    indicators["BB_MIDDLE_20"] = bb.middle;

    return {
      exchangeCode,
      symbol,
      timeframe,
      price: candles[candles.length - 1].close,
      candles: candles.map((c) => ({ close: c.close, volume: c.volume, openTime: c.openTime })),
      indicators,
    };
  }

  /**
   * List recent signals (paginated).
   */
  async listRecent(limit: number = 50, offset: number = 0) {
    return db.signal.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * List signals filtered by symbol/direction.
   */
  async listBySymbol(symbol: string, limit: number = 50) {
    return db.signal.findMany({
      where: { symbol },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

// Singleton
let _instance: IntelligenceService | null = null;
export function getIntelligenceService(): IntelligenceService {
  if (!_instance) _instance = new IntelligenceService();
  return _instance;
}

// Re-export condition type for callers
export type { BaseCondition };
