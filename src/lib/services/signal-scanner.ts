/**
 * Proxigrid — Signal scanner
 *
 * Periodically generates signals for a watchlist so the app surfaces
 * opportunities on its own (instead of only on a manual "Scan"). The client
 * detects strong new signals from the feed and prompts the user to act.
 *
 * Started from instrumentation.ts on boot, only when ENABLE_SIGNAL_SCANNER=true.
 */

import { getIntelligenceService } from "./intelligence-service";
import { db } from "../db";
import type { CandleInterval } from "../exchanges/types";

let started = false;

export function startSignalScanner(): void {
  if (started) return;
  started = true;

  const seconds = Math.max(30, Number(process.env.SIGNAL_SCAN_SEC ?? 120));
  const timeframe = (process.env.SIGNAL_SCAN_TIMEFRAME ?? "1h") as CandleInterval;
  const baseSymbols = (process.env.SIGNAL_SCAN_SYMBOLS ??
    "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const intel = getIntelligenceService();

  const tick = async () => {
    // Scan the env watchlist plus any symbols the user has starred.
    let symbols = baseSymbols;
    try {
      const watched = await db.watchItem.findMany();
      symbols = Array.from(new Set([...baseSymbols, ...watched.map((w) => w.symbol)]));
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
    console.log(`[scanner] scanned ${symbols.length} symbol(s) @ ${timeframe}`);
  };

  console.log(`[scanner] started — base [${baseSymbols.join(", ")}] + watchlist, every ${seconds}s`);
  setTimeout(tick, 8000);
  setInterval(tick, seconds * 1000);
}
