/**
 * Proxigrid — Binance API types
 * Subset of Binance REST + WebSocket types used by the adapter.
 */

export interface BinanceExchangeInfoResponse {
  symbols: Array<{
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    status: string;
    baseAssetPrecision: number;
    quoteAssetPrecision: number;
    quotePrecision: number;
  }>;
}

export interface BinanceTicker24hResponse {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
  quoteVolume: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  closeTime: number;
}

export interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
  quoteVolume: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  closeTime: number;
}

// Binance kline response is an array of arrays, each shaped like:
//   [openTime, open, high, low, close, volume, closeTime, ...]
export type BinanceKlineResponse = [
  number, // openTime
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // closeTime
  ...unknown[] // (other fields we ignore)
][];

export interface BinanceOrderBookResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

export interface BinanceAccountResponse {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  updateTime: number;
  balances: Array<{ asset: string; free: string; locked: string }>;
}

export interface BinanceOrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId?: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | string;
  origQty: string;
  price: string;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  transactTime?: number;
}

// WebSocket stream messages
export interface BinanceWsTickerMessage {
  e: "24hrTicker";
  s: string; // symbol
  c: string; // close (last price)
  b: string; // bid
  a: string; // ask
  v: string; // volume
  q: string; // quote volume
  P: string; // price change percent
  h: string; // high
  l: string; // low
  E: number; // event time
}

export interface BinanceWsKlineMessage {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // open time
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    T: number; // close time
    x: boolean; // is closed
  };
}
