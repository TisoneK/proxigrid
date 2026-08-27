/**
 * Proxigrid — Shared market types
 * These types are exchange-agnostic so the platform can grow beyond crypto.
 */

export type ExchangeKind = "crypto" | "forex" | "stock" | "commodity";
export type ExchangeStatus = "active" | "disabled" | "maintenance";

export interface ExchangeInfo {
  code: string; // "binance"
  name: string; // "Binance"
  kind: ExchangeKind;
  status: ExchangeStatus;
  isPaper: boolean;
}

export interface SymbolInfo {
  symbol: string; // "BTCUSDT"
  base: string; // "BTC"
  quote: string; // "USDT"
  exchangeCode: string;
  pricePrecision?: number;
  quantityPrecision?: number;
  isActive: boolean;
}

export interface Ticker {
  exchangeCode: string;
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  volume24h?: number;
  quoteVolume24h?: number;
  priceChangePercent24h?: number;
  high24h?: number;
  low24h?: number;
  timestamp: number; // ms epoch
}

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Candle {
  openTime: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  exchangeCode: string;
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  exchangeCode: string;
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit";

/** Time-in-force: GTC, IOC, FOK, or GTX (post-only). */
export type TimeInForce = "GTC" | "IOC" | "FOK" | "GTX";

/** Self-Trade Prevention mode (manual §3). */
export type SelfTradePreventionMode =
  | "EXPIRE_TAKER"
  | "EXPIRE_MAKER"
  | "EXPIRE_BOTH"
  | "NONE";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // for limit orders
  clientOrderId?: string;
  /** Defaults to GTC for limit orders; ignored for market orders. */
  timeInForce?: TimeInForce;
  selfTradePreventionMode?: SelfTradePreventionMode;
}

export interface OrderResult {
  exchangeCode: string;
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  status: string;
  filledQuantity?: number;
  avgPrice?: number;
  createdAt: number;
}

export interface AccountSummary {
  exchangeCode: string;
  balances: Balance[];
  canTrade: boolean;
  timestamp: number;
}
