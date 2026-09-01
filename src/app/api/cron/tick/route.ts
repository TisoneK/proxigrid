import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAutomationService } from "@/lib/services/automation-service";
import { scanOnce } from "@/lib/services/signal-scanner";

// Serverless cron entrypoint (Vercel Cron hits this on the schedule in
// vercel.json). Runs one signal-scan pass and one automation sweep — the work
// the always-on workers do on an interval when self-hosted.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // seconds

// Constant-time header check: SHA-256 digests have a fixed length, so
// timingSafeEqual can compare them without leaking how much of the secret
// matched. Hashing (rather than comparing raw bytes) also normalizes length.
function cronAuthorized(headerValue: string | null, secret: string): boolean {
  if (!headerValue) return false;
  const got = createHash("sha256").update(headerValue).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(got, expected);
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
  // set. Fail closed: with no secret configured, nobody (including cron) can
  // trigger the endpoint — an unset secret must mean "locked", not "open".
  const secret = process.env.CRON_SECRET;
  if (!secret || !cronAuthorized(req.headers.get("authorization"), secret)) {
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
