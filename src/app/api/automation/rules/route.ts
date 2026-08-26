import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";
import type { RuleAction } from "@/lib/rules/actions";
import type { TriggerConfig } from "@/lib/services/automation-service";

export async function GET() {
  const rules = await getAutomationService().listRules();
  return NextResponse.json({
    rules: rules.map((r) => ({
      ...r,
      trigger: JSON.parse(r.trigger),
      action: JSON.parse(r.action),
      executions: r.executions?.map((e) => ({
        ...e,
        triggerSnapshot: JSON.parse(e.triggerSnapshot),
        actionResult: JSON.parse(e.actionResult),
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, trigger, action, enabled, cooldownSec } = body as {
    name: string;
    description?: string;
    trigger: TriggerConfig;
    action: RuleAction;
    enabled?: boolean;
    cooldownSec?: number;
  };

  if (!name || !trigger || !action) {
    return NextResponse.json(
      { error: "name, trigger, action required" },
      { status: 400 }
    );
  }

  const rule = await getAutomationService().createRule({
    name,
    description,
    trigger,
    action,
    enabled,
    cooldownSec,
  });
  return NextResponse.json(rule);
}
