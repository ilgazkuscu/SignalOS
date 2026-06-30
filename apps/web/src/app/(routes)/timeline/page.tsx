import React from "react";
import { TimelineView } from "@/features/timeline/timeline-view";
import { getTimeline } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const timeline = await getTimeline({ liveDataMode: "cached" });
  return <TimelineView timeline={timeline} />;
}
