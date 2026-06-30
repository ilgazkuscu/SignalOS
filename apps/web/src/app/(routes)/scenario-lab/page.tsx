import React from "react";
import { ScenarioLab } from "@/features/scenario/scenario-lab";
import { getDashboard } from "@/lib/api/service";
import { getRepository } from "@/lib/db/provider";

export const dynamic = "force-dynamic";

export default async function ScenarioLabPage() {
  const [dashboard, scenarios] = await Promise.all([
    getDashboard("balanced", { liveDataMode: "cached" }),
    getRepository().getScenarios(),
  ]);

  return <ScenarioLab baseline={dashboard.currentBelief} scenarios={scenarios} />;
}
