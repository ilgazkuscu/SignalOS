import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyStatementInput } from "@/lib/api/service";

const schema = z.object({
  text: z.string(),
  sourceType: z.string(),
  officialness: z.number(),
  mediaFormat: z.enum(["text", "video", "transcript"]),
  speaker: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.parse(await request.json());
  return NextResponse.json(await classifyStatementInput(parsed));
}
