import React from "react";
import { ModelExplainer } from "@/features/model/model-explainer";
import { getDashboard } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export default async function ModelPage() {
  const data = await getDashboard("balanced", { liveDataMode: "cached" });
  return <ModelExplainer data={data} />;
}
