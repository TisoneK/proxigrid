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
  const depth = intParam(url.searchParams.get("depth"), 20, 1, 100);

  if (!symbol) {
    return NextResponse.json(
      { error: "symbol query param required" },
      { status: 400 }
    );
  }

  try {
    const book = await getMarketDataService().getOrderBook(
      exchange,
      symbol,
      depth
    );
    return NextResponse.json(book);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
