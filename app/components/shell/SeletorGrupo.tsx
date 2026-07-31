"use client";

import { useGroup } from "@/contexts/GroupContext";

/**
 * Seletor de grupo ativo do shell.
 * - Admin: dropdown com "Visão geral" + todos os grupos.
 * - Coordinator/member: apenas o nome do grupo (fixo, sem troca).
 */
export default function SeletorGrupo({ className = "" }: { className?: string }) {
  const {
    activeGroupId,
    activeGroupName,
    setActiveGroup,
    groups,
    canSwitchGroup,
    isLoading,
  } = useGroup();

  if (isLoading) return null;

  if (!canSwitchGroup) {
    return (
      <div className={className}>
        <div className="text-[10.5px] font-semibold uppercase tracking-[1px] text-faint">
          Grupo
        </div>
        <div className="mt-0.5 text-[13.5px] font-semibold text-ink">
          {activeGroupName ?? "—"}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        aria-label="Grupo ativo"
        value={activeGroupId ?? ""}
        onChange={(e) => setActiveGroup(e.target.value || null)}
        className="w-full appearance-none rounded-[11px] border border-black/10 bg-paper px-3 py-2 pr-8 text-[13px] font-medium text-ink outline-none"
      >
        <option value="">Visão geral</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
        ▾
      </span>
    </div>
  );
}
