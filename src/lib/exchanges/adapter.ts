/**
 * Proxigrid — ExchangeAdapter interface
 *
 * The contract every exchange/market data provider must implement.
 * Adding a new exchange = implementing this interface + registering it.
 */

import type {
  AccountSummary,
  Balance,
  Candle,
  CandleInterval,
  ExchangeInfo,
  OrderBook,
  OrderRequest,
  OrderResult,
  SymbolInfo,
  Ticker,
} from "./types";

export interface ExchangeAdapter {
  /** Stable code, e.g. "binance" */
  readonly code: string;

  /** Human name, e.g. "Binance" */
  readonly name: string;

  /** Market category */
  readonly kind: "crypto" | "forex" | "stock" | "commodity";

  /** Whether this adapter is configured (credentials present) */
  isConfigured(): boolean;

  /** Public metadata about the exchange */
  info(): ExchangeInfo;

  /** List tradable symbols (optionally filtered) */
  getSymbols(): Promise<SymbolInfo[]>;

  /** Current ticker for a symbol */
  getTicker(symbol: string): Promise<Ticker>;

  /** Batch tickers (some exchanges support this natively) */
  getTickers(symbols?: string[]): Promise<Ticker[]>;

  /** Historical candles */
  getCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number
  ): Promise<Candle[]>;

  /** Order book snapshot */
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  // ---- Private (account) endpoints ----
  // These will throw if credentials are missing.

  getAccountSummary(): Promise<AccountSummary>;
  getBalances(): Promise<Balance[]>;
  placeOrder(req: OrderRequest): Promise<OrderResult>;
  cancelOrder(symbol: string, orderId: string): Promise<void>;
}

/**
 * Base class providing common helpers (config loading, error wrapping).
 */
export abstract class BaseExchangeAdapter implements ExchangeAdapter {
  abstract readonly code: string;
  abstract readonly name: string;
  abstract readonly kind: "crypto" | "forex" | "stock" | "commodity";

  protected apiKey?: string;
  protected apiSecret?: string;
  protected isPaper: boolean = true;

  constructor(opts?: { apiKey?: string; apiSecret?: string; isPaper?: boolean }) {
    this.apiKey = opts?.apiKey;
    this.apiSecret = opts?.apiSecret;
    this.isPaper = opts?.isPaper ?? true;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  info(): ExchangeInfo {
    return {
      code: this.code,
      name: this.name,
      kind: this.kind,
      status: "active",
      isPaper: this.isPaper,
    };
  }

  // Concrete methods to be implemented by adapters
  abstract getSymbols(): Promise<SymbolInfo[]>;
  abstract getTicker(symbol: string): Promise<Ticker>;
  abstract getTickers(symbols?: string[]): Promise<Ticker[]>;
  abstract getCandles(
    symbol: string,
    interval: CandleInterval,
    limit?: number
  ): Promise<Candle[]>;
  abstract getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  abstract getAccountSummary(): Promise<AccountSummary>;
  abstract getBalances(): Promise<Balance[]>;
  abstract placeOrder(req: OrderRequest): Promise<OrderResult>;
  abstract cancelOrder(symbol: string, orderId: string): Promise<void>;

  protected requireCredentials(): void {
    if (!this.isConfigured()) {
      throw new Error(
        `Exchange "${this.code}" requires API credentials for this operation. ` +
          `Set ${this.code.toUpperCase()}_API_KEY and ${this.code.toUpperCase()}_API_SECRET in .env`
      );
    }
  }
}
