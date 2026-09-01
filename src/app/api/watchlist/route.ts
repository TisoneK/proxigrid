import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/watchlist — list starred symbols. */
export async function GET() {
  const items = await db.watchItem.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ symbols: items.map((i) => i.symbol) });
}

/** POST /api/watchlist { symbol } — star a symbol (idempotent). */
export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }
    const s = symbol.trim().toUpperCase();
    // Exchange-native symbols are short alphanumerics (BTCUSDT, BTC-USD, …);
    // reject anything else so the scanner never tries to scan junk rows.
    if (s.length < 2 || s.length > 32 || !/^[A-Z0-9:\-_.]+$/.test(s)) {
      return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
    }
    await db.watchItem.upsert({ where: { symbol: s }, create: { symbol: s }, update: {} });
    return NextResponse.json({ symbol: s, watched: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
