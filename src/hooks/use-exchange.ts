"use client";

import { useLocalStringSetting } from "@/hooks/use-local-setting";

/** Key for the app-wide selected market-data exchange. */
export const EXCHANGE_KEY = "proxigrid:exchange";
export const DEFAULT_EXCHANGE = "binance";

/**
 * The exchange the user is browsing. localStorage-backed and synced across
 * every component that reads it (via useSyncExternalStore), so the switcher and
 * the market surfaces stay in lockstep without a context provider.
 *
 * Note: this drives *market data* only. Trading, signals, and automations are
 * Binance-scoped in v1 — components gate those on the coin's own exchangeCode.
 */
export function useExchange(): [string, (code: string) => void] {
  return useLocalStringSetting(EXCHANGE_KEY, DEFAULT_EXCHANGE);
}
