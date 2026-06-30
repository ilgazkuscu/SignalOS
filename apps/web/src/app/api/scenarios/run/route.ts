import { NextResponse } from "next/server";
import { z } from "zod";
import { runScenario } from "@/lib/api/service";

const scenarioSchema = z.object({
  profileKey: z.enum(["conservative", "balanced", "opportunistic"]).default("balanced"),
  events: z.array(
    z.object({
      title: z.string(),
      family: z.enum([
        "trumpTelemetry",
        "cabinetAlignment",
        "forcePosture",
        "strategicFlights",
        "diplomaticChannels",
        "proxyTempo",
        "pizzaIndex",
        "resolutionWording",
        "marketMicrostructure",
        "macroConfirmation",
        "manualJudgment",
      ]),
      magnitude: z.number(),
      confidence: z.number(),
      rationale: z.string(),
      occurredAt: z.string(),
    }),
  ),
});

export async function POST(request: Request) {
  const parsed = scenarioSchema.parse(await request.json());
  return NextResponse.json(await runScenario(parsed.profileKey, parsed.events));
}
