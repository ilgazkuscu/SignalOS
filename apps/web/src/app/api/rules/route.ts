import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/provider";

export async function GET() {
  const markets = await getRepository().getMarkets();
  return NextResponse.json(markets.map((market) => market.resolutionCriteria));
}
