import React from "react";
import { ReplayView } from "@/features/replay/replay-view";
import { getReplayPayload } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export default async function ReplayPage() {
  const replay = await getReplayPayload("balanced");
  return <ReplayView replay={replay} />;
}
