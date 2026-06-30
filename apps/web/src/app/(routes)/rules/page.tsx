import React from "react";
import { RulesPanel } from "@/features/rules/rules-panel";
import { getRepository } from "@/lib/db/provider";

export default async function RulesPage() {
  const markets = await getRepository().getMarkets();
  return <RulesPanel markets={markets} />;
}
