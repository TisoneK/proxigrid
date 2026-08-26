import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const rule = await getAutomationService().toggleRule(id, enabled);
  return NextResponse.json(rule);
}
