/**
 * Proxigrid — Binance exchange-filter validation
 *
 * Orders must satisfy each symbol's dynamic filters from GET /api/v3/exchangeInfo
 * (manual §3), or Binance rejects them (e.g. -1013). Validating client-side gives
 * a clear, immediate error instead of a round-trip rejection:
 *   - PRICE_FILTER: min/max price and tickSize (price increment)
 *   - LOT_SIZE:     min/max qty and stepSize (quantity increment)
 *   - NOTIONAL / MIN_NOTIONAL: minimum order value (price × quantity)
 */

import type { BinanceSymbolFilter } from "./binance-types";

export interface OrderValidationInput {
  type: "MARKET" | "LIMIT";
  quantity: number;
  /** Required for LIMIT orders (and for notional checks). */
  price?: number;
}

export type FilterResult = { ok: true } | { ok: false; reason: string };

/** True if `value` is an integer multiple of `step` (float-tolerant). */
function isMultipleOf(value: number, step: number): boolean {
  if (step <= 0) return true;
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-8;
}

/** Read a numeric field from a filter object (the union is intentionally open). */
function num(filter: BinanceSymbolFilter, key: string): number {
  return parseFloat(String((filter as Record<string, unknown>)[key] ?? "NaN"));
}

export function validateOrderAgainstFilters(
  filters: BinanceSymbolFilter[],
  input: OrderValidationInput
): FilterResult {
  for (const f of filters) {
    if (f.filterType === "PRICE_FILTER" && input.type === "LIMIT") {
      if (input.price === undefined) {
        return { ok: false, reason: "limit order requires a price" };
      }
      const tickSize = num(f, "tickSize");
      const minPrice = num(f, "minPrice");
      const maxPrice = num(f, "maxPrice");
      if (minPrice > 0 && input.price < minPrice) {
        return { ok: false, reason: `price ${input.price} below minPrice ${minPrice}` };
      }
      if (maxPrice > 0 && input.price > maxPrice) {
        return { ok: false, reason: `price ${input.price} above maxPrice ${maxPrice}` };
      }
      if (!isMultipleOf(input.price, tickSize)) {
        return { ok: false, reason: `price ${input.price} is not a multiple of tickSize ${tickSize}` };
      }
    }

    if (f.filterType === "LOT_SIZE") {
      const stepSize = num(f, "stepSize");
      const minQty = num(f, "minQty");
      const maxQty = num(f, "maxQty");
      if (minQty > 0 && input.quantity < minQty) {
        return { ok: false, reason: `quantity ${input.quantity} below minQty ${minQty}` };
      }
      if (maxQty > 0 && input.quantity > maxQty) {
        return { ok: false, reason: `quantity ${input.quantity} above maxQty ${maxQty}` };
      }
      if (!isMultipleOf(input.quantity, stepSize)) {
        return { ok: false, reason: `quantity ${input.quantity} is not a multiple of stepSize ${stepSize}` };
      }
    }

    if (f.filterType === "NOTIONAL" || f.filterType === "MIN_NOTIONAL") {
      const minNotional = num(f, "minNotional");
      // Notional needs a price; for MARKET orders the fill price is unknown here,
      // so this check applies to LIMIT orders (and any priced input).
      if (minNotional > 0 && input.price !== undefined) {
        const notional = input.price * input.quantity;
        if (notional < minNotional) {
          return { ok: false, reason: `notional ${notional} below minNotional ${minNotional}` };
        }
      }
    }
  }

  return { ok: true };
}
