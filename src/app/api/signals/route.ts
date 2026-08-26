import { NextRequest, NextResponse } from "next/server";
import { getIntelligenceService } from "@/lib/services/intelligence-service";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const symbol = url.searchParams.get("symbol");

  const service = getIntelligenceService();
  const signals = symbol
    ? await service.listBySymbol(symbol, limit)
    : await service.listRecent(limit, offset);
  return NextResponse.json({ signals });
}

/**
 * POST /api/signals — generate signals for a symbol/timeframe.
 * Body: { exchange, symbol, timeframe, generators? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchange, symbol, timeframe, generators } = body as {
      exchange: string;
      symbol: string;
      timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
      generators?: string[];
    };
    if (!exchange || !symbol) {
      return NextResponse.json(
        { error: "exchange and symbol required" },
        { status: 400 }
      );
    }
    const signals = await getIntelligenceService().generateAndPersist(
      exchange,
      symbol,
      timeframe ?? "1h",
      generators
    );
    return NextResponse.json({ signals });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
