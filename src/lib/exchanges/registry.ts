/**
 * Proxigrid — Exchange adapter registry
 *
 * Single source of truth for which exchanges are available in this runtime.
 * Add new adapters here as they are implemented.
 *
 * In the future, when Proxigrid expands beyond crypto, this is the only
 * file that needs to change for new asset classes (forex, stocks, etc.).
 */

import type { ExchangeAdapter } from "./adapter";
import { BinanceAdapter } from "./binance/binance-adapter";
import { CoinbaseAdapter } from "./coinbase/coinbase-adapter";

// Lazy singleton map: code -> adapter
const adapters = new Map<string, ExchangeAdapter>();
let initialized = false;

function buildAdapters(): void {
  if (initialized) return;

  // Binance is always available — public endpoints work without credentials.
  // Credentials are read from env at adapter construction time.
  const binance = new BinanceAdapter({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    privateKey: process.env.BINANCE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Ed25519 (preferred)
    isPaper: process.env.BINANCE_PAPER !== "false", // default to testnet for safety
  });
  adapters.set(binance.code, binance);

  // Coinbase — public market data only (browse-only; no credentials needed).
  // Disable with COINBASE_ENABLED=false.
  if (process.env.COINBASE_ENABLED !== "false") {
    const coinbase = new CoinbaseAdapter();
    adapters.set(coinbase.code, coinbase);
  }

  // Adding a new provider (another crypto exchange, or a forex/derivatives
  // broker like Deriv — ExchangeAdapter.kind supports "forex"/"stock"/
  // "commodity"): implement ExchangeAdapter in its own folder and register it
  // here. Nothing else in the app needs to change.
  //   adapters.set("kraken", new KrakenAdapter(...));
  //   adapters.set("deriv", new DerivAdapter(...));   // forex / synthetics
  //   adapters.set("alpaca", new AlpacaAdapter(...));  // stocks

  initialized = true;
}

/**
 * Get an adapter by exchange code.
 * Throws if the adapter is not registered.
 */
export function getAdapter(code: string): ExchangeAdapter {
  buildAdapters();
  const adapter = adapters.get(code.toLowerCase());
  if (!adapter) {
    throw new Error(
      `Exchange adapter "${code}" not registered. Available: ${[...adapters.keys()].join(", ")}`
    );
  }
  return adapter;
}

/**
 * List all registered adapters.
 */
export function listAdapters(): ExchangeAdapter[] {
  buildAdapters();
  return [...adapters.values()];
}

/**
 * List exchange codes only.
 */
export function listExchangeCodes(): string[] {
  buildAdapters();
  return [...adapters.keys()];
}

/**
 * Check whether an adapter is registered.
 */
export function hasAdapter(code: string): boolean {
  buildAdapters();
  return adapters.has(code.toLowerCase());
}
