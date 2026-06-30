"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDefaultFamilyId, getFamilyById, registeredFamilies } from "@/engine/families";

export function useSelectedFamily() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const familyParam = searchParams.get("family");
  const routedFamily = useMemo(() => getFamilyById(familyParam), [familyParam]);
  const [pendingFamilyId, setPendingFamilyId] = useState<string | null>(null);
  const family = pendingFamilyId ? getFamilyById(pendingFamilyId) : routedFamily;

  useEffect(() => {
    if (pendingFamilyId && pendingFamilyId === routedFamily.id) {
      setPendingFamilyId(null);
    }
  }, [pendingFamilyId, routedFamily.id]);

  useEffect(() => {
    if (familyParam && registeredFamilies.some((item) => item.id === familyParam)) return;

    const next = new URLSearchParams(searchParams.toString());
    next.set("family", getDefaultFamilyId());
    router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
  }, [familyParam, pathname, router, searchParams]);

  const setFamily = useCallback(
    (id: string) => {
      setPendingFamilyId(id);
      const next = new URLSearchParams(searchParams.toString());
      next.set("family", id);
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { family, setFamily };
}
