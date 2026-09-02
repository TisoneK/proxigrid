/**
 * Proxigrid — Signal scanner
 *
 * Generates signals for a watchlist so the app surfaces opportunities on its
 * own (instead of only on a manual "Scan"). The client detects strong new
 * signals from the feed and prompts the user to act.
 *
 * Two drivers share one pass (`scanOnce`):
 *   - a long-running interval (`startSignalScanner`, from instrumentation.ts,
 *     when ENABLE_SIGNAL_SCANNER=true) — for self-hosted / always-on servers.
 *   - a scheduled hit to /api/cron/tick — for serverless (Vercel Cron), where
 *     setInterval doesn't survive between requests.
 */

import { getIntelligenceService } from "./intelligence-service";
import { db } from "../db";
import type { CandleInterval } from "../exchanges/types";

function baseSymbols(): string[] {
  return (process.env.SIGNAL_SCAN_SYMBOLS ?? "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/** One scan pass: generate signals for the env watchlist + starred symbols, resolve pending outcomes, then prune. */
export async function scanOnce(): Promise<{ scanned: number; pruned: number; outcomes: { checked: number; resolved: number } }> {
  const timeframe = (process.env.SIGNAL_SCAN_TIMEFRAME ?? "1h") as CandleInterval;
  const intel = getIntelligenceService();

  let symbols = baseSymbols();
  try {
    const watched = await db.watchItem.findMany();
    symbols = Array.from(new Set([...symbols, ...watched.map((w) => w.symbol)]));
  } catch {
    /* db unavailable — fall back to env symbols */
  }
  for (const symbol of symbols) {
    try {
      await intel.generateAndPersist("binance", symbol, timeframe);
    } catch (e) {
      console.error(`[scanner] ${symbol} failed:`, (e as Error).message);
    }
  }

  // Fill in 1h/24h outcome returns for directional signals whose horizon has
  // passed — this is what makes the signal feed's hit-rate real over time.
  let outcomes = { checked: 0, resolved: 0 };
  try {
    outcomes = await intel.checkSignalOutcomes();
  } catch (e) {
    console.error(`[scanner] outcome check failed:`, (e as Error).message);
  }

  let pruned = 0;
  try {
    pruned = await intel.pruneOldSignals();
  } catch (e) {
    console.error(`[scanner] prune failed:`, (e as Error).message);
  }
  console.log(`[scanner] scanned ${symbols.length} symbol(s) @ ${timeframe}, outcomes ${outcomes.resolved}/${outcomes.checked}, pruned ${pruned}`);
  return { scanned: symbols.length, pruned, outcomes };
}

let started = false;

export function startSignalScanner(): void {
  if (started) return;
  started = true;

  const seconds = Math.max(30, Number(process.env.SIGNAL_SCAN_SEC ?? 120));
  console.log(`[scanner] started — base [${baseSymbols().join(", ")}] + watchlist, every ${seconds}s`);
  setTimeout(() => void scanOnce(), 8000);
  setInterval(() => void scanOnce(), seconds * 1000);
}
