import { NextResponse } from "next/server";
import { appRuntime } from "@/lib/config/env";
import { getRepository } from "@/lib/db/provider";

export async function POST() {
  return NextResponse.json({
    persisted: false,
    mode: appRuntime.dataMode,
    repositoryMode: appRuntime.repositoryFixtureMode ? "seeded-repository" : "database",
    profiles: await getRepository().getWeightProfiles(),
  });
}
