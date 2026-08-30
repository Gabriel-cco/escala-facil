"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { logAccess } from "@/lib/access-log";

const DEBOUNCE_MS = 5_000;

export function useAccessLogPageView(accountId: string | undefined) {
  const pathname = usePathname();
  const lastLoggedRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const now = Date.now();
    const last = lastLoggedRef.current;

    // Não re-loga o mesmo path dentro da janela de debounce (cobre abertura/fechamento de modais)
    if (last && last.path === pathname && now - last.at < DEBOUNCE_MS) return;

    lastLoggedRef.current = { path: pathname, at: now };
    logAccess(accountId, "view_page", { path: pathname });
  }, [pathname, accountId]);
}
