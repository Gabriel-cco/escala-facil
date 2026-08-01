"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = {
  id: string;
  name: string;
  active: boolean;
  membroCount: number;
  funcaoCount: number;
};

const iconeLapis = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeArquivar = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
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

  async function arquivar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase.from("groups").update({ active: false }).eq("id", grupo.id);
    setProcessando(false);
    setConfirmando(false);
    router.refresh();
  }

  async function reativar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase.from("groups").update({ active: true }).eq("id", grupo.id);
    setProcessando(false);
    router.refresh();
  }

  return (
    <>
      <div
        className={`group flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-paper shadow-card px-[18px] py-4 md:rounded-[18px] md:p-[22px] ${
          !grupo.active ? "opacity-55" : ""
        }`}
      >
        <Link
          href={`/grupos/${grupo.id}`}
          className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1.5"
        >
          <div className="font-serif text-[18px] font-semibold text-ink md:text-[20px]">
            {grupo.name}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted md:text-[12.5px]">
            <span>
              {grupo.membroCount} membros · {grupo.funcaoCount} funções
            </span>
            {!grupo.active && (
              <span className="rounded-full bg-[#e5e7eb] px-2 py-0.5 text-[10.5px] font-semibold text-[#6b7280]">
                Inativo
              </span>
            )}
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

            {grupo.active ? (
              <button
                onClick={() => setConfirmando(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-[#8a6200]"
                title="Arquivar grupo"
              >
                {iconeArquivar}
              </button>
            ) : (
              <button
                onClick={reativar}
                disabled={processando}
                className="whitespace-nowrap rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-50"
              >
                Reativar
              </button>
            )}
          </div>
        ) : (
          <div className="text-[22px] text-[#9ca3af] md:hidden">›</div>
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
                ARQUIVAR
              </div>
              <div className="mb-2 font-serif text-[19px] font-semibold text-ink">
                Arquivar grupo?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#6b7280]">
                &ldquo;{grupo.name}&rdquo; ficará inativo e não aparecerá nas
                listas, mas poderá ser reativado depois.
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
                  onClick={arquivar}
                  disabled={processando}
                  className="rounded-[14px] bg-[#8a6200] py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {processando ? "Arquivando..." : "Arquivar grupo"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
