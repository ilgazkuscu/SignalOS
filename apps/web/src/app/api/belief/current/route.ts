import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/api/service";

export async function GET() {
  const dashboard = await getDashboard("balanced");
  return NextResponse.json(dashboard.currentBelief);
}
