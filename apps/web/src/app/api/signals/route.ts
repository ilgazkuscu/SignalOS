import { NextResponse } from "next/server";
import { getSignalsExplorer } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSignalsExplorer("balanced"));
}
