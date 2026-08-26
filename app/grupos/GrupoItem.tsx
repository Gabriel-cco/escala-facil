"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = {
  id: string;
  name: string;
  description: string | null;
  membroCount: number;
  funcaoCount: number;
};

const iconeLapis = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeExcluir = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export default function GrupoItem({
  grupo,
  podeGerenciar,
}: {
  grupo: Grupo;
  podeGerenciar: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const router = useRouter();

  async function excluir() {
    setProcessando(true);
    const supabase = createClient();
    // accounts.group_id → groups ON DELETE SET NULL violaria o CHECK (member must have group)
    // → deletamos os accounts do grupo primeiro
    await supabase.from("accounts").delete().eq("group_id", grupo.id);
    // O CASCADE cuida do resto: roles, events, assignments, attendance_lists, etc.
    await supabase.from("groups").delete().eq("id", grupo.id);
    setProcessando(false);
    setConfirmando(false);
    router.refresh();
  }

  return (
    <>
      <div className="group flex items-start gap-2.5 rounded-2xl border border-black/[0.06] bg-paper shadow-card transition-shadow hover:shadow-hover px-[18px] py-[18px] md:rounded-[18px] md:px-[22px] md:py-[20px]">
        <Link href={`/grupos/${grupo.id}`} className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold text-ink md:text-[18px]">
            {grupo.name}
          </div>
          {grupo.description && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
              {grupo.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-[12.5px] text-muted">
            <span>
              <span className="font-semibold text-ink">{grupo.membroCount}</span>{" "}
              membros
            </span>
            <span>
              <span className="font-semibold text-ink">{grupo.funcaoCount}</span>{" "}
              funções
            </span>
          </div>
        </Link>

        {podeGerenciar ? (
          <div className="flex flex-none items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
            <Link
              href={`/grupos/editar/${grupo.id}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
              title="Editar grupo"
            >
              {iconeLapis}
            </Link>
            <button
              onClick={() => setConfirmando(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-danger"
              title="Excluir grupo"
            >
              {iconeExcluir}
            </button>
          </div>
        ) : (
          <div className="text-[22px] text-[#B3A296] md:hidden">›</div>
        )}
      </div>

      {confirmando && (
        <>
          <div
            onClick={() => !processando && setConfirmando(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">
                EXCLUIR
              </div>
              <div className="mb-2 font-serif text-[19px] font-semibold text-ink">
                Excluir grupo?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
                Esta ação é permanente e não pode ser desfeita. Serão removidos
                todos os dados de &ldquo;{grupo.name}&rdquo;: funções, eventos,
                escalas e o acesso de todos os membros.
              </p>
              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  onClick={() => setConfirmando(false)}
                  disabled={processando}
                  className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluir}
                  disabled={processando}
                  className="rounded-[14px] bg-danger py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {processando ? "Excluindo..." : "Excluir grupo"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
