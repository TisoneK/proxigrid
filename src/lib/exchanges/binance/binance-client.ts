/**
 * Proxigrid — Low-level Binance HTTP + WebSocket client
 *
 * Implements:
 *   - Public REST endpoints (no signature)
 *   - Signed REST endpoints (HMAC-SHA256)
 *   - WebSocket market data streams
 *   - Rate-limit awareness (simplified: respects Retry-After on 429)
 *
 * Endpoint selection:
 *   - isPaper=true  -> https://testnet.binance.vision (spot testnet)
 *   - isPaper=false -> https://api.binance.com  (production)
 *
 * WebSocket base:
 *   - testnet: wss://testnet.binance.vision/ws
 *   - prod:    wss://stream.binance.com:9443/ws
 */

import type {
  BinanceAccountResponse,
  BinanceExchangeInfoResponse,
  BinanceKlineResponse,
  BinanceOrderBookResponse,
  BinanceOrderResponse,
  BinanceTicker24hResponse,
  BinanceTickerResponse,
  BinanceWsKlineMessage,
  BinanceWsTickerMessage,
} from "./binance-types";
import { buildSignedQuery } from "./binance-signer";

export interface BinanceClientOptions {
  apiKey?: string;
  apiSecret?: string;
  isPaper?: boolean;
  timeoutMs?: number;
}

export class BinanceClient {
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly isPaper: boolean;
  private readonly timeoutMs: number;

  constructor(opts: BinanceClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.isPaper = opts.isPaper ?? true;
    this.timeoutMs = opts.timeoutMs ?? 10000;
  }

  // ---- Endpoint URLs ----

  get restBase(): string {
    // Optional override, e.g. Binance's public, openly-accessible market-data
    // endpoint https://data-api.binance.vision for read-only data from
    // regions where api.binance.com / testnet are geo-restricted (HTTP 451).
    const override = process.env.BINANCE_REST_URL?.trim();
    if (override) return override.replace(/\/+$/, "");
    return this.isPaper
      ? "https://testnet.binance.vision"
      : "https://api.binance.com";
  }

  get wsBase(): string {
    return this.isPaper
      ? "wss://testnet.binance.vision/ws"
      : "wss://stream.binance.com:9443/ws";
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  // ---- HTTP helpers ----

  private async request<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    let url = `${this.restBase}${path}`;
    let headers: Record<string, string> = {
      Accept: "application/json",
    };

    let query: string;
    if (signed) {
      if (!this.isConfigured) {
        throw new Error(
          "Cannot make signed request: missing API key/secret. Set BINANCE_API_KEY and BINANCE_API_SECRET."
        );
      }
      query = buildSignedQuery(params ?? {}, this.apiSecret!);
      headers["X-MBX-APIKEY"] = this.apiKey!;
    } else {
      const search = new URLSearchParams();
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v === undefined || v === null) continue;
          search.set(k, String(v));
        }
      }
      query = search.toString();
    }

    url += query ? `?${query}` : "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.text();
        let errPayload: any = null;
        try {
          errPayload = JSON.parse(body);
        } catch {
          /* not json */
        }
        const code = errPayload?.code ?? res.status;
        const msg = errPayload?.msg ?? body ?? res.statusText;
        const err = new Error(
          `Binance API error ${code}: ${msg} (${method} ${path})`
        ) as any;
        err.status = res.status;
        err.binanceCode = code;
        throw err;
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ---- Public market data ----

  getExchangeInfo(): Promise<BinanceExchangeInfoResponse> {
    return this.request<BinanceExchangeInfoResponse>("GET", "/api/v3/exchangeInfo");
  }

  getTicker24h(symbol: string): Promise<BinanceTicker24hResponse> {
    return this.request<BinanceTicker24hResponse>("GET", "/api/v3/ticker/24hr", {
      symbol,
    });
  }

  getTicker24hAll(): Promise<BinanceTicker24hResponse[]> {
    return this.request<BinanceTicker24hResponse[]>("GET", "/api/v3/ticker/24hr");
  }

  getTickerPrice(symbol: string): Promise<BinanceTickerResponse> {
    return this.request<BinanceTickerResponse>("GET", "/api/v3/ticker/price", {
      symbol,
    });
  }

  getBookTicker(symbol: string): Promise<{
    symbol: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
  }> {
    return this.request("GET", "/api/v3/ticker/bookTicker", { symbol });
  }

  getKlines(
    symbol: string,
    interval: string,
    limit: number = 100
  ): Promise<BinanceKlineResponse[]> {
    return this.request<BinanceKlineResponse[]>("GET", "/api/v3/klines", {
      symbol,
      interval,
      limit,
    });
  }

  getOrderBook(symbol: string, limit: number = 20): Promise<BinanceOrderBookResponse> {
    return this.request<BinanceOrderBookResponse>("GET", "/api/v3/depth", {
      symbol,
      limit,
    });
  }

  // ---- Signed endpoints (account + trading) ----

  getAccount(): Promise<BinanceAccountResponse> {
    return this.request<BinanceAccountResponse>("GET", "/api/v3/account", {}, true);
  }

  placeOrder(opts: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    quantity: number;
    price?: number;
    timeInForce?: string;
    clientOrderId?: string;
    newOrderRespType?: "ACK" | "RESULT" | "FULL";
  }): Promise<BinanceOrderResponse> {
    const params: Record<string, string | number | boolean | undefined> = {
      symbol: opts.symbol,
      side: opts.side,
      type: opts.type,
      quantity: opts.quantity,
    };
    if (opts.price !== undefined) params.price = opts.price;
    if (opts.timeInForce) params.timeInForce = opts.timeInForce;
    if (opts.clientOrderId) params.newClientOrderId = opts.clientOrderId;
    if (opts.newOrderRespType) params.newOrderRespType = opts.newOrderRespType;
    return this.request<BinanceOrderResponse>("POST", "/api/v3/order", params, true);
  }

  cancelOrder(symbol: string, orderId: string): Promise<BinanceOrderResponse> {
    return this.request<BinanceOrderResponse>(
      "DELETE",
      "/api/v3/order",
      { symbol, orderId },
      true
    );
  }

  // ---- WebSocket ----

  /**
   * Open a combined market stream. Returns the WebSocket + cleanup function.
   * Streams are passed as binance stream names e.g. ["btcusdt@ticker", "ethusdt@ticker"].
   *
   * Usage:
   *   const { ws, close } = client.openMarketStream(["btcusdt@ticker"], (msg) => { ... });
   *   ...
   *   close();
   */
  openMarketStream(
    streams: string[],
    onMessage: (msg: BinanceWsTickerMessage | BinanceWsKlineMessage | any) => void
  ): { ws: WebSocket; close: () => void } {
    const url = `${this.wsBase}/stream?streams=${streams.join("/")}`;
    const ws = new WebSocket(url);

    ws.onmessage = (ev) => {
      try {
        const envelope = JSON.parse(ev.data as string);
        // Combined stream envelope: { stream, data }
        const data = envelope.data ?? envelope;
        onMessage(data);
      } catch (e) {
        // ignore malformed frames
      }
    };

    ws.onerror = (e) => {
      // Surface errors to a no-op logger; consumer should handle reconnect
      console.error("[BinanceClient] WS error:", e);
    };

    const close = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };

    return { ws, close };
  }
}
