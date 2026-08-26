/**
 * Proxigrid — Binance exchange adapter
 *
 * Implements ExchangeAdapter on top of BinanceClient.
 * Maps Binance-specific responses to Proxigrid's exchange-agnostic types.
 */

import type { ExchangeAdapter } from "../adapter";
import { BaseExchangeAdapter } from "../adapter";
import { BinanceClient } from "./binance-client";
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

const INTERVAL_MAP: Record<CandleInterval, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

export class BinanceAdapter extends BaseExchangeAdapter implements ExchangeAdapter {
  readonly code = "binance";
  readonly name = "Binance";
  readonly kind = "crypto" as const;

  private readonly client: BinanceClient;

  constructor(opts?: { apiKey?: string; apiSecret?: string; isPaper?: boolean }) {
    super(opts);
    this.client = new BinanceClient({
      apiKey: opts?.apiKey ?? process.env.BINANCE_API_KEY,
      apiSecret: opts?.apiSecret ?? process.env.BINANCE_API_SECRET,
      isPaper: opts?.isPaper ?? (process.env.BINANCE_PAPER !== "false"),
    });
  }

  /** Expose client for stream consumers (IntelligenceService / WS service) */
  getClient(): BinanceClient {
    return this.client;
  }

  async getSymbols(): Promise<SymbolInfo[]> {
    const info = await this.client.getExchangeInfo();
    return info.symbols
      .filter((s) => s.status === "TRADING")
      .map((s) => ({
        symbol: s.symbol,
        base: s.baseAsset,
        quote: s.quoteAsset,
        exchangeCode: this.code,
        pricePrecision: s.quoteAssetPrecision,
        quantityPrecision: s.baseAssetPrecision,
        isActive: true,
      }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const t = await this.client.getTicker24h(symbol);
    return {
      exchangeCode: this.code,
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      bid: parseFloat(t.bidPrice),
      ask: parseFloat(t.askPrice),
      volume24h: parseFloat(t.volume),
      quoteVolume24h: parseFloat(t.quoteVolume),
      priceChangePercent24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      timestamp: t.closeTime,
    };
  }

  async getTickers(symbols?: string[]): Promise<Ticker[]> {
    if (symbols && symbols.length > 0 && symbols.length <= 1) {
      return [await this.getTicker(symbols[0])];
    }
    const all = await this.client.getTicker24hAll();
    let filtered = all;
    if (symbols && symbols.length > 0) {
      const set = new Set(symbols);
      filtered = all.filter((t) => set.has(t.symbol));
    }
    return filtered.map((t) => ({
      exchangeCode: this.code,
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      bid: parseFloat(t.bidPrice),
      ask: parseFloat(t.askPrice),
      volume24h: parseFloat(t.volume),
      quoteVolume24h: parseFloat(t.quoteVolume),
      priceChangePercent24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      timestamp: t.closeTime,
    }));
  }

  async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit: number = 200
  ): Promise<Candle[]> {
    const raw = await this.client.getKlines(symbol, INTERVAL_MAP[interval], limit);
    return raw.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));
  }

  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const ob = await this.client.getOrderBook(symbol, depth);
    return {
      exchangeCode: this.code,
      symbol,
      bids: ob.bids.slice(0, depth).map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      asks: ob.asks.slice(0, depth).map(([p, q]) => ({
        price: parseFloat(p),
        quantity: parseFloat(q),
      })),
      timestamp: Date.now(),
    };
  }

  async getAccountSummary(): Promise<AccountSummary> {
    this.requireCredentials();
    const acc = await this.client.getAccount();
    return {
      exchangeCode: this.code,
      balances: acc.balances
        .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b) => ({
          asset: b.asset,
          free: parseFloat(b.free),
          locked: parseFloat(b.locked),
          exchangeCode: this.code,
        })),
      canTrade: acc.canTrade,
      timestamp: acc.updateTime,
    };
  }

  async getBalances(): Promise<Balance[]> {
    const summary = await this.getAccountSummary();
    return summary.balances;
  }

  async placeOrder(req: OrderRequest): Promise<OrderResult> {
    this.requireCredentials();
    const res = await this.client.placeOrder({
      symbol: req.symbol,
      side: req.side === "buy" ? "BUY" : "SELL",
      type: req.type === "market" ? "MARKET" : "LIMIT",
      quantity: req.quantity,
      price: req.price,
      timeInForce: req.type === "limit" ? "GTC" : undefined,
      clientOrderId: req.clientOrderId,
      newOrderRespType: "RESULT",
    });
    return {
      exchangeCode: this.code,
      orderId: String(res.orderId),
      clientOrderId: res.clientOrderId,
      symbol: res.symbol,
      side: req.side,
      type: req.type,
      quantity: parseFloat(res.origQty),
      price: res.price ? parseFloat(res.price) : undefined,
      status: res.status,
      filledQuantity: parseFloat(res.executedQty) || 0,
      avgPrice: parseFloat(res.cummulativeQuoteQty) || undefined,
      createdAt: res.transactTime ?? Date.now(),
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    this.requireCredentials();
    await this.client.cancelOrder(symbol, orderId);
  }
}
