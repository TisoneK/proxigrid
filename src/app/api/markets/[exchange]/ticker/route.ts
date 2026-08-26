import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";

interface RouteContext {
  params: Promise<{ exchange: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { exchange } = await ctx.params;
  try {
    const ticker = await getMarketDataService().getTickers(exchange);
    // Return only the top symbols by quote volume to keep response size reasonable
    const sorted = [...ticker]
      .sort(
        (a, b) =>
          (b.quoteVolume24h ?? 0) - (a.quoteVolume24h ?? 0)
      )
      .slice(0, 100);
    return NextResponse.json({ exchange, count: sorted.length, tickers: sorted });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
