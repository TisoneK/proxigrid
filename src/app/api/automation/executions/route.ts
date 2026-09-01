import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";
import { intParam } from "@/lib/params";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const ruleId = url.searchParams.get("ruleId") ?? undefined;
  const limit = intParam(url.searchParams.get("limit"), 50, 1, 200);
  const execs = await getAutomationService().listExecutions(ruleId, limit);
  return NextResponse.json({
    executions: execs.map((e) => ({
      ...e,
      triggerSnapshot: JSON.parse(e.triggerSnapshot),
      actionResult: JSON.parse(e.actionResult),
    })),
  });
}
