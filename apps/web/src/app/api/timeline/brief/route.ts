import { NextResponse } from "next/server";
import { getTimeline } from "@/lib/api/service";
import { buildEliteBriefMarkdown } from "@/lib/intelligence/briefing";

export const dynamic = "force-dynamic";

export async function GET() {
  const timeline = await getTimeline();
  return new NextResponse(buildEliteBriefMarkdown(timeline), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
