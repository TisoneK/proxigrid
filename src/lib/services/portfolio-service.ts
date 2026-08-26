/**
 * Proxigrid — PortfolioService
 *
 * Aggregates holdings across exchanges and computes net worth in a quote
 * currency (default: USDT for crypto exchanges). Falls back gracefully if
 * an exchange is not configured.
 */

import { db } from "../db";
import { getAdapter, listAdapters } from "../exchanges/registry";
import type { Balance, ExchangeInfo, Ticker } from "../exchanges/types";

export interface PortfolioSummary {
  quoteCurrency: string;
  totalValue: number;
  byExchange: { exchange: ExchangeInfo; value: number }[];
  holdings: {
    exchangeCode: string;
    asset: string;
    quantity: number;
    priceInQuote: number;
    valueInQuote: number;
  }[];
  unconfiguredExchanges: string[];
}

const DEFAULT_QUOTE = "USDT";

export class PortfolioService {
  /**
   * Compute current portfolio value across all configured exchanges.
   * Unconfigured exchanges are listed but excluded from the total.
   */
  async summarize(quote: string = DEFAULT_QUOTE): Promise<PortfolioSummary> {
    const adapters = listAdapters();
    const holdings: PortfolioSummary["holdings"] = [];
    const byExchange: PortfolioSummary["byExchange"] = [];
    const unconfiguredExchanges: string[] = [];
    let totalValue = 0;

    for (const adapter of adapters) {
      const info = adapter.info();
      if (!adapter.isConfigured()) {
        unconfiguredExchanges.push(info.code);
        continue;
      }

      try {
        const balances = await adapter.getBalances();
        // Build price lookup: for each asset, fetch price against quote.
        const priceLookup = await this.buildPriceLookup(adapter.code, balances, quote);

        let exchangeValue = 0;
        for (const b of balances) {
          const qty = b.free + b.locked;
          if (qty <= 0) continue;
          const priceInQuote =
            b.asset === quote ? 1 : (priceLookup.get(b.asset) ?? 0);
          const valueInQuote = qty * priceInQuote;
          exchangeValue += valueInQuote;
          holdings.push({
            exchangeCode: adapter.code,
            asset: b.asset,
            quantity: qty,
            priceInQuote,
            valueInQuote,
          });
          totalValue += valueInQuote;
        }
        byExchange.push({ exchange: info, value: exchangeValue });
      } catch (e) {
        // If the call fails (e.g. testnet down), surface as unconfigured
        console.warn(`[PortfolioService] ${info.code} failed:`, (e as Error).message);
        unconfiguredExchanges.push(info.code);
      }
    }

    return {
      quoteCurrency: quote,
      totalValue,
      byExchange,
      holdings: holdings.sort((a, b) => b.valueInQuote - a.valueInQuote),
      unconfiguredExchanges,
    };
  }

  /**
   * Build a map: asset -> price in quote currency.
   * For Binance: try `assetQuote` ticker; if not available, fall back via USDT.
   */
  private async buildPriceLookup(
    exchangeCode: string,
    balances: Balance[],
    quote: string
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const adapter = getAdapter(exchangeCode);

    const assets = [...new Set(balances.map((b) => b.asset))];
    const tickersToFetch: string[] = [];
    for (const asset of assets) {
      if (asset === quote) {
        map.set(asset, 1);
        continue;
      }
      tickersToFetch.push(`${asset}${quote}`);
    }

    if (tickersToFetch.length === 0) return map;

    try {
      const tickers = await adapter.getTickers(tickersToFetch);
      const tickerBySymbol = new Map<string, Ticker>();
      for (const t of tickers) tickerBySymbol.set(t.symbol, t);

      for (const asset of assets) {
        if (asset === quote) continue;
        const direct = tickerBySymbol.get(`${asset}${quote}`);
        if (direct) {
          map.set(asset, direct.price);
          continue;
        }
        // Try USDT bridge
        if (quote !== "USDT") {
          const usdtAsset = tickerBySymbol.get(`${asset}USDT`);
          const usdtQuote = tickerBySymbol.get(`${quote}USDT`);
          if (usdtAsset && usdtQuote) {
            map.set(asset, usdtAsset.price * usdtQuote.price);
            continue;
          }
        }
        // Could not resolve — treat as 0 (will be flagged in UI)
        map.set(asset, 0);
      }
    } catch (e) {
      console.warn(`[PortfolioService] price lookup failed:`, (e as Error).message);
    }

    return map;
  }
}

// Singleton
let _instance: PortfolioService | null = null;
export function getPortfolioService(): PortfolioService {
  if (!_instance) _instance = new PortfolioService();
  return _instance;
}
