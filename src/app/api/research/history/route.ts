import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";
import { saveCandles, loadCandles } from "@/lib/research/data/history-store";
import { intParam } from "@/lib/params";

export const maxDuration = 60;

/**
 * POST /api/research/history — backfill HistoricalCandle from the live
 * exchange. Body: { exchange?, symbol, timeframe?, candles? (<=1000) }.
 * Idempotent on the natural key, so re-running over overlapping windows is safe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      exchange = "binance",
      symbol,
      timeframe = "1h",
      candles: count = 1000,
    } = (body ?? {}) as { exchange?: string; symbol?: string; timeframe?: string; candles?: number };

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const limit = intParam(String(count ?? 1000), 1000, 100, 1000);

    const live = await getMarketDataService().getCandles(exchange, symbol, timeframe as never, limit);
    const saved = await saveCandles(exchange, symbol, timeframe, live);
    return NextResponse.json({
      ok: true,
      exchange,
      symbol,
      timeframe,
      fetched: live.length,
      saved,
      range: live.length ? { from: live[0].openTime, to: live[live.length - 1].openTime } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** GET /api/research/history?symbol=&timeframe=&limit= — read stored candles count/range. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const exchange = sp.get("exchange") ?? "binance";
    const symbol = sp.get("symbol");
    const timeframe = sp.get("timeframe") ?? "1h";
    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
    const limit = intParam(sp.get("limit"), 1000, 1, 5000);
    const candles = await loadCandles(exchange, symbol, timeframe, limit);
    return NextResponse.json({
      exchange,
      symbol,
      timeframe,
      count: candles.length,
      range: candles.length ? { from: candles[0].openTime, to: candles[candles.length - 1].openTime } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
