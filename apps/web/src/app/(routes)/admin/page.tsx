import React from "react";
import { WeightsEditor } from "@/features/admin/weights-editor";
import { getRepository } from "@/lib/db/provider";

export default async function AdminPage() {
  const profiles = await getRepository().getWeightProfiles();
  return <WeightsEditor profiles={profiles} />;
}
