import { NextResponse } from "next/server";
import { z } from "zod";
import { appRuntime } from "@/lib/config/env";

const manualSignalSchema = z.object({
  title: z.string(),
  family: z.string(),
  magnitude: z.number(),
  confidence: z.number(),
  rationale: z.string(),
  occurredAt: z.string(),
});

export async function POST(request: Request) {
  const parsed = manualSignalSchema.parse(await request.json());
  return NextResponse.json({
    accepted: false,
    persisted: false,
    mode: appRuntime.dataMode,
    message:
      "Manual signal ingestion is not connected to persistent storage in this deployment. Use Scenario Lab for what-if signals; production ingestion comes from the live timeline adapters.",
    signal: parsed,
  }, { status: 501 });
}
