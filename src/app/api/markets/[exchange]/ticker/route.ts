import { NextRequest, NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";

interface RouteContext {
  params: Promise<{ exchange: string }>;
}

// Stablecoins and fiat we don't want to show as a "coin" (e.g. USDC/USDT).
const NON_COIN_BASES = new Set([
  "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "USTC", "AEUR", "USD1",
  "EUR", "GBP", "TRY", "BRL", "AUD", "NGN", "RUB", "UAH", "ZAR", "IDRT", "BIDR",
]);
// Binance leveraged tokens (BTCUPUSDT, ETHDOWNUSDT, …) — not spot coins.
const LEVERAGED = /(UP|DOWN|BULL|BEAR)USDT$/;

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { exchange } = await ctx.params;
  const quote = (req.nextUrl.searchParams.get("quote") ?? "USDT").toUpperCase();
  try {
    const ticker = await getMarketDataService().getTickers(exchange);
    // Curate to real, sensible markets: spot pairs quoted in `quote` (USDT by
    // default), excluding stablecoin/fiat "coins" and leveraged tokens. Without
    // this the top-by-volume list is dominated by obscure fiat pairs (e.g.
    // BTC/IDR) whose prices are meaningless when shown as USD.
    const curated = ticker.filter((t) => {
      const s = t.symbol.toUpperCase();
      if (!s.endsWith(quote) || s.length <= quote.length) return false;
      const base = s.slice(0, -quote.length);
      // Exclude explicit non-coins and anything that looks like a USD stablecoin.
      if (NON_COIN_BASES.has(base) || base.endsWith("USD")) return false;
      return !LEVERAGED.test(s);
    });
    const sorted = (curated.length > 0 ? curated : ticker)
      .slice()
      .sort((a, b) => (b.quoteVolume24h ?? 0) - (a.quoteVolume24h ?? 0))
      .slice(0, 100);
    return NextResponse.json({ exchange, count: sorted.length, tickers: sorted });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
