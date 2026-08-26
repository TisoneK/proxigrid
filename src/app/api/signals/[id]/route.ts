import { NextRequest, NextResponse } from "next/server";
import { getIntelligenceService } from "@/lib/services/intelligence-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  // Signals don't have a direct getById in service — query DB
  const { db } = await import("@/lib/db");
  const signal = await db.signal.findUnique({ where: { id } });
  if (!signal) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(signal);
}
