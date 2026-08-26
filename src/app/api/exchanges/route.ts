import { NextResponse } from "next/server";
import { getMarketDataService } from "@/lib/services/market-data-service";

export async function GET() {
  const service = getMarketDataService();
  const exchanges = service.listExchanges();
  return NextResponse.json({ exchanges });
}
