"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { logAccess } from "@/lib/access-log";

export function useAccessLogPageView(accountId: string | undefined) {
  const pathname = usePathname();

  useEffect(() => {
    if (!accountId) return;
    logAccess(accountId, "view_page", { path: pathname });
  }, [pathname, accountId]);
}
