/**
 * Proxigrid — Coinbase public market-data client
 *
 * Thin wrapper over Coinbase's Advanced Trade *public* market endpoints
 * (https://api.coinbase.com/api/v3/brokerage/market/*). These need no auth and,
 * unlike Binance's signed endpoints, are reachable without geo restrictions.
 *
 * Market data only — order entry / balances are not implemented here.
 */

const BASE_URL = "https://api.coinbase.com/api/v3/brokerage/market";

export interface CoinbaseProduct {
  product_id: string; // "BTC-USD"
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  base_currency_id: string;
  quote_currency_id: string;
  base_name: string;
  status: string; // "online"
  product_type: string; // "SPOT"
  trading_disabled: boolean;
  is_disabled: boolean;
  view_only: boolean;
}

export interface CoinbaseCandle {
  start: string; // unix seconds
  low: string;
  high: string;
  open: string;
  close: string;
  volume: string;
}

export interface CoinbaseBookLevel {
  price: string;
  size: string;
}

export class CoinbaseClient {
  private async publicGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      // Public market data — short cache is fine; the service layer also caches.
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Coinbase ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  async getProducts(): Promise<CoinbaseProduct[]> {
    const data = await this.publicGet<{ products: CoinbaseProduct[] }>("/products", {
      product_type: "SPOT",
    });
    return data.products ?? [];
  }

  async getProduct(productId: string): Promise<CoinbaseProduct> {
    return this.publicGet<CoinbaseProduct>(`/products/${encodeURIComponent(productId)}`);
  }

  async getCandles(
    productId: string,
    granularity: string,
    start: number,
    end: number
  ): Promise<CoinbaseCandle[]> {
    const data = await this.publicGet<{ candles: CoinbaseCandle[] }>(
      `/products/${encodeURIComponent(productId)}/candles`,
      { start, end, granularity }
    );
    return data.candles ?? [];
  }

  async getProductBook(
    productId: string,
    limit: number
  ): Promise<{ bids: CoinbaseBookLevel[]; asks: CoinbaseBookLevel[]; time: string }> {
    const data = await this.publicGet<{
      pricebook: { bids: CoinbaseBookLevel[]; asks: CoinbaseBookLevel[]; time: string };
    }>("/product_book", { product_id: productId, limit });
    return data.pricebook;
  }
}
