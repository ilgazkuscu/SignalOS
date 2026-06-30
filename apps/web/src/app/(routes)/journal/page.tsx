import React from "react";
import { TradeJournal } from "@/features/journal/trade-journal";
import { getDashboard } from "@/lib/api/service";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const dashboard = await getDashboard("balanced", { liveDataMode: "cached" });
  return <TradeJournal dashboard={dashboard} />;
}
