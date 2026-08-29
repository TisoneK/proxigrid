/**
 * Proxigrid — Coinbase exchange adapter
 *
 * Implements the shared ExchangeAdapter contract on top of Coinbase's public
 * Advanced Trade market data. This is the reference for adding *any* new
 * provider (a crypto exchange, or a forex/derivatives broker like Deriv):
 * implement ExchangeAdapter, map the provider's responses to Proxigrid's
 * exchange-agnostic types, and register it in registry.ts. Nothing outside
 * this folder needs to know Coinbase exists.
 *
 * Scope: market data only (browse-only). Order entry / balances are not
 * implemented — the private methods throw a clear, typed error.
 */

import type { ExchangeAdapter } from "../adapter";
import { BaseExchangeAdapter } from "../adapter";
import { CoinbaseClient, type CoinbaseProduct } from "./coinbase-client";
import type {
  AccountSummary,
  Balance,
  Candle,
  CandleInterval,
  OrderBook,
  OrderRequest,
  OrderResult,
  SymbolInfo,
  Ticker,
} from "../types";

/** Coinbase granularity enum has no 4h — 4h maps to its nearest, SIX_HOUR. */
const GRANULARITY: Record<CandleInterval, string> = {
  "1m": "ONE_MINUTE",
  "5m": "FIVE_MINUTE",
  "15m": "FIFTEEN_MINUTE",
  "1h": "ONE_HOUR",
  "4h": "SIX_HOUR",
  "1d": "ONE_DAY",
};
const GRANULARITY_SEC: Record<CandleInterval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 21600,
  "1d": 86400,
};
const MAX_CANDLES = 350; // Coinbase per-request cap.

/** Quote currencies we surface (USD-forward, most liquid). */
const QUOTES = new Set(["USD"]);

export class CoinbaseAdapter extends BaseExchangeAdapter implements ExchangeAdapter {
  readonly code = "coinbase";
  readonly name = "Coinbase";
  readonly kind = "crypto" as const;

  private readonly client: CoinbaseClient;

  constructor(opts?: { isPaper?: boolean }) {
    // Market data needs no credentials; isConfigured() stays false (no trading).
    super({ isPaper: opts?.isPaper ?? false });
    this.client = new CoinbaseClient();
  }

  private tradable(p: CoinbaseProduct): boolean {
    return (
      p.product_type === "SPOT" &&
      p.status === "online" &&
      !p.trading_disabled &&
      !p.is_disabled &&
      !p.view_only &&
      QUOTES.has(p.quote_currency_id)
    );
  }

  private toTicker(p: CoinbaseProduct): Ticker {
    const price = parseFloat(p.price);
    const baseVol = parseFloat(p.volume_24h);
    return {
      exchangeCode: this.code,
      symbol: p.product_id, // native "BTC-USD"
      price,
      volume24h: baseVol,
      // Coinbase reports base volume; approximate the quote volume for sorting.
      quoteVolume24h: Number.isFinite(baseVol) && Number.isFinite(price) ? baseVol * price : undefined,
      priceChangePercent24h: parseFloat(p.price_percentage_change_24h),
      timestamp: Date.now(),
    };
  }

  async getSymbols(): Promise<SymbolInfo[]> {
    const products = await this.client.getProducts();
    return products.filter((p) => this.tradable(p)).map((p) => ({
      symbol: p.product_id,
      base: p.base_currency_id,
      quote: p.quote_currency_id,
      exchangeCode: this.code,
      isActive: true,
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const p = await this.client.getProduct(symbol);
    const ticker = this.toTicker(p);
    // The product endpoint has no 24h high/low — derive them from recent candles
    // so the coin detail shows real numbers instead of blanks.
    try {
      const candles = await this.getCandles(symbol, "1h", 24);
      if (candles.length) {
        ticker.high24h = Math.max(...candles.map((c) => c.high));
        ticker.low24h = Math.min(...candles.map((c) => c.low));
      }
    } catch {
      /* high/low are best-effort */
    }
    return ticker;
  }

  async getTickers(symbols?: string[]): Promise<Ticker[]> {
    const products = await this.client.getProducts();
    let usable = products.filter((p) => this.tradable(p));
    if (symbols && symbols.length > 0) {
      const set = new Set(symbols);
      usable = usable.filter((p) => set.has(p.product_id));
    }
    return usable.map((p) => this.toTicker(p));
  }

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number = 200
  ): Promise<Candle[]> {
    const granSec = GRANULARITY_SEC[interval];
    const n = Math.min(Math.max(limit, 1), MAX_CANDLES);
    const end = Math.floor(Date.now() / 1000);
    const start = end - n * granSec;
    const raw = await this.client.getCandles(symbol, GRANULARITY[interval], start, end);
    return raw
      .map((k) => ({
        openTime: parseInt(k.start, 10) * 1000,
        open: parseFloat(k.open),
        high: parseFloat(k.high),
        low: parseFloat(k.low),
        close: parseFloat(k.close),
        volume: parseFloat(k.volume),
        closeTime: (parseInt(k.start, 10) + granSec) * 1000,
      }))
      // Coinbase returns most-recent-first; charts expect chronological order.
      .sort((a, b) => a.openTime - b.openTime);
  }

  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const book = await this.client.getProductBook(symbol, depth);
    return {
      exchangeCode: this.code,
      symbol,
      bids: book.bids.slice(0, depth).map((l) => ({
        price: parseFloat(l.price),
        quantity: parseFloat(l.size),
      })),
      asks: book.asks.slice(0, depth).map((l) => ({
        price: parseFloat(l.price),
        quantity: parseFloat(l.size),
      })),
      timestamp: book.time ? new Date(book.time).getTime() : Date.now(),
    };
  }

  // ---- Private endpoints: not implemented (browse-only in v1) ----

  private notSupported(): never {
    throw new Error(
      "Coinbase is market-data only in Proxigrid — trading and balances are not available on this exchange yet."
    );
  }

  async getAccountSummary(): Promise<AccountSummary> {
    this.notSupported();
  }
  async getBalances(): Promise<Balance[]> {
    this.notSupported();
  }
  async placeOrder(_req: OrderRequest): Promise<OrderResult> {
    this.notSupported();
  }
  async cancelOrder(_symbol: string, _orderId: string): Promise<void> {
    this.notSupported();
  }
}
