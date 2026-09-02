import { NextRequest, NextResponse } from "next/server";
import { getIntelligenceService } from "@/lib/services/intelligence-service";
import { intParam } from "@/lib/params";

/**
 * GET /api/signals/performance?days=7 — hit-rate + average direction-adjusted
 * return of resolved directional signals (1h/24h horizons), overall and per
 * indicator. Data accrues as the scanner resolves outcomes; an empty/young
 * deployment legitimately returns zero totals.
 */
export async function GET(req: NextRequest) {
  try {
    const days = intParam(req.nextUrl.searchParams.get("days"), 7, 1, 90);
    const perf = await getIntelligenceService().performance(days);
    return NextResponse.json(perf);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
