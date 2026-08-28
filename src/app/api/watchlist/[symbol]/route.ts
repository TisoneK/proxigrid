import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ symbol: string }>;
}

/** DELETE /api/watchlist/:symbol — unstar a symbol. */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { symbol } = await ctx.params;
  await db.watchItem.deleteMany({ where: { symbol: symbol.toUpperCase() } });
  return NextResponse.json({ symbol: symbol.toUpperCase(), watched: false });
}
