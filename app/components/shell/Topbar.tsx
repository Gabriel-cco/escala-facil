"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShell } from "./menu-context";
import { useGroup } from "@/contexts/GroupContext";

/**
 * Topbar (72px) do layout web: título em serifa + voltar (detalhes) +
 * botão de ação contextual. Conteúdo vem do chrome registrado por cada página.
 */
export default function Topbar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { chrome } = useShell();
  const { activeGroupName, isGlobalView, canSwitchGroup, isLoading } =
    useGroup();

  // Rótulo do grupo ativo: admin em visão geral vê "Visão geral".
  const grupoLabel = isLoading
    ? null
    : isGlobalView
    ? canSwitchGroup
      ? "Visão geral"
      : null
    : activeGroupName;

  return (
    <header
      className={`h-[72px] flex-none items-center justify-between border-b border-border bg-paper px-10 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        {chrome.showBack && (
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-black/10 bg-paper text-[20px] leading-none text-ink"
          >
            ‹
          </button>
        )}
        <div className="font-serif text-[25px] font-semibold text-ink">
          {chrome.title}
        </div>
        {grupoLabel && (
          <span className="rounded-full border border-black/10 bg-paper px-3 py-1 text-[12px] font-medium text-ink-soft">
            {grupoLabel}
          </span>
        )}
      </div>

      {chrome.actionLabel && chrome.actionHref && (
        <Link
          href={chrome.actionHref}
          className="rounded-lg bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {chrome.actionLabel}
        </Link>
      )}
    </header>
  );
}
