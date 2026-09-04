/**
 * Proxigrid Research Engine — History store (docs/RESEARCH-ENGINE.md §2 data/)
 *
 * Persists historical candles so research runs are not bounded by whatever a
 * live fetch happens to return. The upsert is idempotent on the model's
 * (exchangeCode, symbol, timeframe, openTime) unique key, so re-backfilling an
 * overlapping window is safe. Reads return plain Candle objects ready for
 * `dataset.split()`.
 *
 * BigInt care: Prisma maps the schema's BigInt openTime/closeTime to JS bigint.
 * All writes go through BigInt(...) at the boundary; reads convert back to
 * number (ms epochs fit comfortably in a double).
 */

import { db } from "@/lib/db";
import type { Candle } from "@/lib/exchanges/types";

const MAX_BARS = 5000; // sane cap per read/write call

/** Upsert a batch of candles (idempotent on the natural key). */
export async function saveCandles(
  exchangeCode: string,
  symbol: string,
  timeframe: string,
  candles: Candle[]
): Promise<number> {
  const rows = candles.slice(0, MAX_BARS);
  await db.$transaction(async (tx) => {
    for (const c of rows) {
      await tx.historicalCandle
        .upsert({
          where: {
            exchangeCode_symbol_timeframe_openTime: {
              exchangeCode,
              symbol,
              timeframe,
              openTime: BigInt(c.openTime),
            },
          },
          create: {
            exchangeCode,
            symbol,
            timeframe,
            openTime: BigInt(c.openTime),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            closeTime: BigInt(c.closeTime),
          },
          update: {
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
            closeTime: BigInt(c.closeTime),
          },
        })
        .catch((e: { code?: string }) => {
          // A concurrent backfill of an overlapping window can race the same
          // natural key; the row existing is exactly the goal, so swallow it.
          if (e?.code !== "P2002") throw e;
        });
    }
  });
  return rows.length;
}

/** Read stored candles ascending by openTime, shaped as Candle[]. */
export async function loadCandles(
  exchangeCode: string,
  symbol: string,
  timeframe: string,
  limit: number = MAX_BARS
): Promise<Candle[]> {
  const rows = await db.historicalCandle.findMany({
    where: { exchangeCode, symbol, timeframe },
    orderBy: { openTime: "asc" },
    take: Math.min(Math.max(1, limit), MAX_BARS),
  });
  return rows.map((r) => ({
    openTime: Number(r.openTime),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    closeTime: Number(r.closeTime),
  }));
}
