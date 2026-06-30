import { NextResponse } from "next/server";
import { getReplayPayload } from "@/lib/api/service";

export async function GET() {
  return NextResponse.json(await getReplayPayload("balanced"));
}
