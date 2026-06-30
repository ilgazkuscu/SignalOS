import React from "react";
import { PanelSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <PanelSkeleton rows={5} />
      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={6} />
      <PanelSkeleton rows={5} />
    </div>
  );
}
