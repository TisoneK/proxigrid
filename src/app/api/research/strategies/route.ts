import { NextRequest, NextResponse } from "next/server";
import { getResearchStore } from "@/lib/research/store/research-store";
import { STRATEGY_STATUSES, isStrategyStatus } from "@/lib/research/lifecycle/state-machine";

/** GET /api/research/strategies?status=PAPER — list strategies with recent experiments. */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    if (status && !isStrategyStatus(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${STRATEGY_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    const strategies = await getResearchStore().listStrategies(status ?? undefined);
    return NextResponse.json({ strategies });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
