import { NextResponse } from "next/server";
import { getPortfolioService } from "@/lib/services/portfolio-service";

export async function GET() {
  try {
    const summary = await getPortfolioService().summarize();
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
