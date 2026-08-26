/**
 * Proxigrid — MarketDataService
 *
 * Thin façade over the exchange registry. All UI/API layers should call this
 * service, not the adapters directly. This isolates the rest of the app from
 * adapter-specific behavior and provides a single place to add caching,
 * rate-limit handling, and unified symbol search.
 */

import { getAdapter, listAdapters, listExchangeCodes } from "../exchanges/registry";
import type {
  Candle,
  CandleInterval,
  ExchangeInfo,
  OrderBook,
  SymbolInfo,
  Ticker,
} from "../exchanges/types";

// In-memory cache for tickers (TTL: 2s) — keeps UI snappy under burst load.
const tickerCache = new Map<string, { value: Ticker; expiresAt: number }>();
const TICKER_TTL_MS = 2000;

export class MarketDataService {
  listExchanges(): ExchangeInfo[] {
    return listAdapters().map((a) => a.info());
  }

  listExchangeCodes(): string[] {
    return listExchangeCodes();
  }

  async getSymbols(exchangeCode: string): Promise<SymbolInfo[]> {
    return getAdapter(exchangeCode).getSymbols();
  }

  async getTicker(exchangeCode: string, symbol: string): Promise<Ticker> {
    const cacheKey = `${exchangeCode}:${symbol}`;
    const cached = tickerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const ticker = await getAdapter(exchangeCode).getTicker(symbol);
    tickerCache.set(cacheKey, { value: ticker, expiresAt: Date.now() + TICKER_TTL_MS });
    return ticker;
  }

  async getTickers(exchangeCode: string, symbols?: string[]): Promise<Ticker[]> {
    return getAdapter(exchangeCode).getTickers(symbols);
  }

  async getCandles(
    exchangeCode: string,
    symbol: string,
    interval: CandleInterval,
    limit: number = 200
  ): Promise<Candle[]> {
    return getAdapter(exchangeCode).getCandles(symbol, interval, limit);
  }

  async getOrderBook(
    exchangeCode: string,
    symbol: string,
    depth: number = 20
  ): Promise<OrderBook> {
    return getAdapter(exchangeCode).getOrderBook(symbol, depth);
  }
}

// Singleton
let _instance: MarketDataService | null = null;
export function getMarketDataService(): MarketDataService {
  if (!_instance) _instance = new MarketDataService();
  return _instance;
}
