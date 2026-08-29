"use client";

import { useLocalStringSetting } from "@/hooks/use-local-setting";
import { useExchanges } from "@/hooks/use-exchanges";

/** Key for the app-wide selected market-data exchange. */
export const EXCHANGE_KEY = "proxigrid:exchange";
export const DEFAULT_EXCHANGE = "binance";

/**
 * The exchange the user is browsing. localStorage-backed and synced across
 * every component that reads it (via useSyncExternalStore), so the switcher and
 * the market surfaces stay in lockstep without a context provider.
 *
 * Self-healing: if the stored exchange isn't currently registered (e.g. a
 * provider was disabled after the user had selected it), the read coerces to
 * the default so the market grid never queries a missing adapter. The stored
 * value is left intact, so re-enabling the provider restores the prior choice.
 *
 * Note: this drives *market data* only. Trading, signals, and automations are
 * Binance-scoped in v1 — components gate those on the coin's own exchangeCode.
 */
export function useExchange(): [string, (code: string) => void] {
  const [stored, setStored] = useLocalStringSetting(EXCHANGE_KEY, DEFAULT_EXCHANGE);
  const { data: exchanges } = useExchanges();
  const codes = (exchanges ?? []).map((e) => e.code);
  const value = codes.length > 0 && !codes.includes(stored) ? DEFAULT_EXCHANGE : stored;
  return [value, setStored];
}
