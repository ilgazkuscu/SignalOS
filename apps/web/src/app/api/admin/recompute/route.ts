import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/api/service";

export async function POST() {
  return NextResponse.json(await getDashboard("balanced"));
}
