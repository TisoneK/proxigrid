/**
 * Proxigrid — Low-level Binance HTTP + WebSocket client
 *
 * Implements:
 *   - Public REST endpoints (no signature)
 *   - Signed REST endpoints (HMAC-SHA256 or Ed25519)
 *   - WebSocket market data streams
 *   - Server-time sync (corrects local clock drift → avoids -1021 rejections)
 *   - Rate-limit handling: 429 (weight exceeded) and 418 (IP ban) raise a
 *     typed error carrying Retry-After, so callers back off instead of
 *     hammering the endpoint into a longer ban
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
  BinanceSymbolFilter,
  BinanceTicker24hResponse,
  BinanceTickerResponse,
  BinanceWsKlineMessage,
  BinanceWsTickerMessage,
} from "./binance-types";
import { buildSignedQuery, type SigningCredential } from "./binance-signer";

export interface BinanceClientOptions {
  apiKey?: string;
  /** HMAC-SHA256 shared secret. Ignored when an Ed25519 privateKey is given. */
  apiSecret?: string;
  /** Ed25519 private key (PEM). When present, signing uses Ed25519 (preferred). */
  privateKey?: string;
  isPaper?: boolean;
  timeoutMs?: number;
  /** Default recvWindow (ms) for signed requests. Binance caps this at 60000. */
  recvWindowMs?: number;
}

/** Raised on HTTP 429 (weight exceeded) / 418 (IP ban) so callers can back off. */
export class BinanceRateLimitError extends Error {
  readonly status: number;
  readonly retryAfterSec?: number;
  readonly banned: boolean;
  constructor(status: number, retryAfterSec: number | undefined, detail: string) {
    super(
      `Binance rate limit: HTTP ${status}${
        status === 418 ? " (IP banned)" : ""
      }${retryAfterSec ? ` — retry after ${retryAfterSec}s` : ""}. ${detail}`
    );
    this.name = "BinanceRateLimitError";
    this.status = status;
    this.retryAfterSec = retryAfterSec;
    this.banned = status === 418;
  }
}

export class BinanceClient {
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly privateKey?: string;
  private readonly isPaper: boolean;
  private readonly timeoutMs: number;
  private readonly recvWindowMs: number;

  /** serverTime - localTime, in ms; applied to every signed timestamp. */
  private timeOffsetMs = 0;
  private timeSyncedAt = 0;

  constructor(opts: BinanceClientOptions = {}) {
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.privateKey = opts.privateKey;
    this.isPaper = opts.isPaper ?? true;
    this.timeoutMs = opts.timeoutMs ?? 10000;
    this.recvWindowMs = Math.min(opts.recvWindowMs ?? 5000, 60000);
  }

  /** Resolve the active signing scheme — Ed25519 preferred when a key is set. */
  private signingCredential(): SigningCredential {
    if (this.privateKey) return { method: "ed25519", privateKeyPem: this.privateKey };
    return { method: "hmac", apiSecret: this.apiSecret! };
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
    return Boolean(this.apiKey && (this.apiSecret || this.privateKey));
  }

  // ---- Server-time synchronization ----

  /** GET /api/v3/time — Binance server time in ms. */
  async getServerTime(): Promise<number> {
    const { serverTime } = await this.request<{ serverTime: number }>(
      "GET",
      "/api/v3/time"
    );
    return serverTime;
  }

  /** Measure and cache the clock offset (serverTime - localTime). */
  async syncTime(): Promise<number> {
    const serverTime = await this.getServerTime();
    this.timeOffsetMs = serverTime - Date.now();
    this.timeSyncedAt = Date.now();
    return this.timeOffsetMs;
  }

  /** Ensure the clock offset is fresh (re-sync at most every 5 minutes). */
  private async ensureTimeSynced(): Promise<void> {
    if (this.timeSyncedAt === 0 || Date.now() - this.timeSyncedAt > 5 * 60_000) {
      try {
        await this.syncTime();
      } catch {
        /* non-fatal: fall back to local clock */
      }
    }
  }

  // ---- HTTP helpers ----

  private async request<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    if (signed) {
      if (!this.isConfigured) {
        throw new Error(
          "Cannot make signed request: missing credentials. Set BINANCE_API_KEY plus either BINANCE_API_SECRET (HMAC) or BINANCE_PRIVATE_KEY (Ed25519)."
        );
      }
      await this.ensureTimeSynced();
      try {
        return await this.sendRequest<T>(method, path, params, true);
      } catch (e: any) {
        // -1021: timestamp outside recvWindow — clock drifted. Re-sync once and retry.
        if (e?.binanceCode === -1021) {
          await this.syncTime();
          return await this.sendRequest<T>(method, path, params, true);
        }
        throw e;
      }
    }
    return this.sendRequest<T>(method, path, params, false);
  }

  private async sendRequest<T>(
    method: "GET" | "POST" | "DELETE" | "PUT",
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    signed: boolean = false
  ): Promise<T> {
    let url = `${this.restBase}${path}`;
    const headers: Record<string, string> = { Accept: "application/json" };

    let query: string;
    if (signed) {
      query = buildSignedQuery(params ?? {}, this.signingCredential(), {
        timestamp: Date.now() + this.timeOffsetMs,
        recvWindow: this.recvWindowMs,
      });
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
        // 429 (weight exceeded) and 418 (IP ban) must be surfaced distinctly so
        // callers back off — continuing to hit 429s escalates to a 418 ban.
        if (res.status === 429 || res.status === 418) {
          const ra = res.headers.get("Retry-After");
          throw new BinanceRateLimitError(
            res.status,
            ra ? Number(ra) : undefined,
            `${method} ${path}`
          );
        }
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

  /** Exchange filters for a single symbol (PRICE_FILTER / LOT_SIZE / NOTIONAL / …). */
  async getSymbolFilters(symbol: string): Promise<BinanceSymbolFilter[]> {
    const info = await this.request<BinanceExchangeInfoResponse>(
      "GET",
      "/api/v3/exchangeInfo",
      { symbol }
    );
    return info.symbols[0]?.filters ?? [];
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
    selfTradePreventionMode?: string;
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
    if (opts.selfTradePreventionMode) {
      params.selfTradePreventionMode = opts.selfTradePreventionMode;
    }
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
