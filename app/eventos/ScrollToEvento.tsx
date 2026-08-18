"use client";

import { useEffect } from "react";

/**
 * Ao abrir a lista de eventos, rola suave até o próximo evento onde o usuário
 * logado está escalado (id calculado no servidor) e dá um destaque breve.
 * Não renderiza nada.
 */
export default function ScrollToEvento({ targetId }: { targetId: string | null }) {
  useEffect(() => {
    if (!targetId) return;
    const el = document.getElementById(`evento-${targetId}`);
    if (!el) return;

    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow .3s ease";
      el.style.boxShadow = "0 0 0 2px rgba(79,70,229,0.55)";
      const off = setTimeout(() => {
        el.style.boxShadow = "";
      }, 2200);
      // guarda o timer de limpeza no elemento pra não vazar se remontar
      (el as HTMLElement & { _efOff?: number })._efOff = off as unknown as number;
    }, 120);

    return () => clearTimeout(t);
  }, [targetId]);

  return null;
}
