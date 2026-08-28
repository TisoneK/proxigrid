/**
 * Proxigrid — Automation worker
 *
 * Runs AutomationService.sweep() on an interval so enabled rules evaluate
 * (and fire) on their own, rather than only on a manual "Evaluate now".
 *
 * Started once from instrumentation.ts on server boot, but ONLY when
 * ENABLE_AUTOMATION_WORKER=true — so it never surprises you in dev, and any
 * actual order placement still additionally requires ENABLE_LIVE_TRADING.
 */

import { getAutomationService } from "./automation-service";

let started = false;

export function startAutomationWorker(): void {
  if (started) return;
  started = true;

  const seconds = Math.max(15, Number(process.env.AUTOMATION_SWEEP_SEC ?? 60));
  const intervalMs = seconds * 1000;
  const service = getAutomationService();

  const tick = async () => {
    try {
      const results = await service.sweep();
      if (results.length > 0) {
        const fired = results.filter((r) => r.fired).length;
        console.log(`[automation] swept ${results.length} rule(s), ${fired} fired`);
      }
    } catch (e) {
      console.error("[automation] sweep failed:", (e as Error).message);
    }
  };

  console.log(`[automation] worker started — sweeping every ${seconds}s`);
  // A short delay so the first sweep doesn't race server startup.
  setTimeout(tick, 5000);
  setInterval(tick, intervalMs);
}
