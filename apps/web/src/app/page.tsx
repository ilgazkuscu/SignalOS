import { redirect } from "next/navigation";
import { getDefaultFamilyId } from "@/modules/markets";

export const dynamic = "force-dynamic";

export default function Page() {
  redirect(`/dashboard?family=${getDefaultFamilyId()}&tab=howto`);
}
