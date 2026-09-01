import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";
import type { RuleAction } from "@/lib/rules/actions";
import type { TriggerConfig } from "@/lib/services/automation-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const rule = await getAutomationService().getRule(id);
  if (!rule) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...rule,
    trigger: JSON.parse(rule.trigger),
    action: JSON.parse(rule.action),
    executions: rule.executions?.map((e) => ({
      ...e,
      triggerSnapshot: JSON.parse(e.triggerSnapshot),
      actionResult: JSON.parse(e.actionResult),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { name, description, enabled, trigger, action, cooldownSec } = body as {
    name?: string;
    description?: string;
    enabled?: boolean;
    trigger?: TriggerConfig;
    action?: RuleAction;
    cooldownSec?: number;
  };

  if (!(await getAutomationService().getRule(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const rule = await getAutomationService().updateRule(id, {
    name,
    description,
    enabled,
    trigger,
    action,
    cooldownSec,
  });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!(await getAutomationService().getRule(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await getAutomationService().deleteRule(id);
  return NextResponse.json({ deleted: true });
}

/** Trigger immediate evaluation+execution */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!(await getAutomationService().getRule(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const result = await getAutomationService().evaluateAndExecute(id);
  return NextResponse.json(result);
}
