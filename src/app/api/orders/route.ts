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

    if (!symbol || !side || quantity === undefined) {
      return NextResponse.json(
        { error: "symbol, side and quantity are required" },
        { status: 400 }
      );
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
      quantity: Number(quantity),
      price: price !== undefined ? Number(price) : undefined,
    });

    return NextResponse.json({ status: "placed", order });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
