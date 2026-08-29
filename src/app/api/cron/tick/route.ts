import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";
import { scanOnce } from "@/lib/services/signal-scanner";

// Serverless cron entrypoint (Vercel Cron hits this on the schedule in
// vercel.json). Runs one signal-scan pass and one automation sweep — the work
// the always-on workers do on an interval when self-hosted.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
  // set. Reject anything else so the endpoint isn't publicly triggerable.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scan = await scanOnce().catch((e) => ({ error: (e as Error).message }));
  const sweepResults = await getAutomationService()
    .sweep()
    .catch((e) => ({ error: (e as Error).message }));

  return NextResponse.json({
    ok: true,
    at: new Date().toISOString(),
    scan,
    sweep: Array.isArray(sweepResults)
      ? { evaluated: sweepResults.length, fired: sweepResults.filter((r) => r.fired).length }
      : sweepResults,
  });
}
