import { NextRequest, NextResponse } from "next/server";
import { getResearchStore } from "@/lib/research/store/research-store";
import { STRATEGY_STATUSES, nextStates, isStrategyStatus } from "@/lib/research/lifecycle/state-machine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/research/strategies/{id} — full detail incl. all experiments. */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const strategy = await getResearchStore().getStrategy(id);
    if (!strategy) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ strategy, legalTransitions: nextStates(strategy.status as never) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/research/strategies/{id} — guarded lifecycle transition.
 * Body: { to: StrategyStatus }. The state machine + evidentiary guards apply
 * (e.g. → PAPER requires a passing OOS experiment); illegal moves return 409.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const to = body?.to as string;
    if (!isStrategyStatus(to)) {
      return NextResponse.json(
        { error: `to must be one of: ${STRATEGY_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    const strategy = await getResearchStore().transitionStrategy(id, to);
    return NextResponse.json({ strategy });
  } catch (e: any) {
    const illegal = e.message?.startsWith("Illegal strategy transition") || e.message?.includes("requires a passing");
    return NextResponse.json({ error: e.message }, { status: illegal ? 409 : 500 });
  }
}
