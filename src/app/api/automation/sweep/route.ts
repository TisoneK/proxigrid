import { NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";

/**
 * Evaluate all enabled rules once. Callable by an external cron (e.g. every
 * 60s) as an alternative to the in-process worker, or for manual testing.
 */
export async function POST() {
  try {
    const results = await getAutomationService().sweep();
    return NextResponse.json({
      swept: results.length,
      fired: results.filter((r) => r.fired).length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
