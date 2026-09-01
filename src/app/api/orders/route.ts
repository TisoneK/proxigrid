import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/exchanges/registry";

/**
 * POST /api/orders — place a single order.
 * Body: { exchange?, symbol, side: "buy"|"sell", type?: "market"|"limit", quantity, price? }
 *
 * Safety: no order is placed unless ENABLE_LIVE_TRADING=true — otherwise the
 * request returns { status: "skipped" } so the UI flow can be exercised safely.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      exchange = "binance",
      symbol,
      side,
      type = "market",
      quantity,
      price,
    } = body ?? {};

    // Validate before anything reaches the adapter — the adapter maps any
    // non-"buy" side to SELL, so unvalidated input could silently invert a
    // trade once live trading is on.
    if (
      !symbol ||
      typeof symbol !== "string" ||
      (side !== "buy" && side !== "sell") ||
      (type !== "market" && type !== "limit")
    ) {
      return NextResponse.json(
        { error: "symbol (string), side (buy|sell) and type (market|limit) are required" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    let limitPrice: number | undefined;
    if (type === "limit") {
      limitPrice = Number(price);
      if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
        return NextResponse.json(
          { error: "limit orders require a positive price" },
          { status: 400 }
        );
      }
    }

    if (process.env.ENABLE_LIVE_TRADING !== "true") {
      return NextResponse.json({
        status: "skipped",
        detail: "Live trading is disabled. Set ENABLE_LIVE_TRADING=true (and API keys) to place real orders.",
      });
    }

    const adapter = getAdapter(exchange);
    const order = await adapter.placeOrder({
      symbol,
      side,
      type,
      quantity: qty,
      // Market orders never carry a price — sending one makes Binance reject.
      price: limitPrice,
    });

    return NextResponse.json({ status: "placed", order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
