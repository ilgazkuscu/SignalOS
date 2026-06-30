import { NextResponse } from "next/server";
import { getDashboard, getSignalsExplorer, getTimeline } from "@/lib/api/service";
import { buildFallbackModel2Payload } from "@/lib/signalos/fallback-model2";

export const dynamic = "force-dynamic";

const BASE = "http://127.0.0.1:8000";

export async function GET() {
  try {
    const bundleResponse = await fetch(`${BASE}/current_phase/bundle`, { cache: "no-store" });

    if (!bundleResponse.ok) {
      const [dashboard, signals, timeline] = await Promise.all([
        getDashboard("balanced"),
        getSignalsExplorer("balanced"),
        getTimeline(),
      ]);
      return NextResponse.json(buildFallbackModel2Payload({ dashboard, signals, timeline }));
    }
    return NextResponse.json(await bundleResponse.json());
  } catch {
    const [dashboard, signals, timeline] = await Promise.all([
      getDashboard("balanced"),
      getSignalsExplorer("balanced"),
      getTimeline(),
    ]);
    return NextResponse.json(buildFallbackModel2Payload({ dashboard, signals, timeline }));
  }
}
