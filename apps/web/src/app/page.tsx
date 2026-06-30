import { redirect } from "next/navigation";
import { getDefaultFamilyId } from "@/engine/families";

export const dynamic = "force-dynamic";

export default function Page() {
  redirect(`/dashboard?family=${getDefaultFamilyId()}&tab=howto`);
}
