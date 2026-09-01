import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";
import { intParam } from "@/lib/params";

interface RouteContext {
  params: Promise<{ exchange: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { exchange } = await ctx.params;
  const url = req.nextUrl;
  const symbol = url.searchParams.get("symbol");
  const interval = (url.searchParams.get("interval") ?? "1h") as
    | "1m"
    | "5m"
    | "15m"
    | "1h"
    | "4h"
    | "1d";
  // Binance caps klines at 1000 per request; clamp before it reaches upstream.
  const limit = intParam(url.searchParams.get("limit"), 200, 1, 1000);

  if (!symbol) {
    return NextResponse.json(
      { error: "symbol query param required" },
      { status: 400 }
    );
  }

  try {
    const candles = await getMarketDataService().getCandles(
      exchange,
      symbol,
      interval,
      limit
    );
    return NextResponse.json({
      exchange,
      symbol,
      interval,
      count: candles.length,
      candles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
