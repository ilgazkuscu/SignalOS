import React from "react";
import { SignalExplorer } from "@/features/signals/signal-explorer";
import { getSignalsExplorer } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const initialData = await getSignalsExplorer("balanced", { liveDataMode: "cached" });

  return <SignalExplorer initialData={initialData} />;
}
