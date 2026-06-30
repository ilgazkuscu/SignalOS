import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db/provider";

export async function GET() {
  return NextResponse.json(await getRepository().getScenarios());
}
