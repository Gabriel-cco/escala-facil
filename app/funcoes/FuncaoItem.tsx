"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Funcao = {
  id: string;
  nome: string;
};

const iconeExcluir = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export default function FuncaoItem({
  funcao,
  podeGerenciar,
}: {
  funcao: Funcao;
  podeGerenciar: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const router = useRouter();

  async function excluir() {
    setProcessando(true);
    const supabase = createClient();
    // assignments.role_id → roles ON DELETE CASCADE — atribuições deletadas automaticamente
    await supabase.from("roles").delete().eq("id", funcao.id);
    setProcessando(false);
    setConfirmando(false);
    router.refresh();
  }

  return (
    <>
      <div className="group inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] bg-paper px-3.5 py-2 text-[13px] text-ink transition-colors">
        {podeGerenciar ? (
          <Link
            href={`/funcoes/editar/${funcao.id}`}
            className="font-medium hover:text-primary"
            title="Editar função"
          >
            {funcao.nome}
          </Link>
        ) : (
          <span className="font-medium">{funcao.nome}</span>
        )}

        {podeGerenciar && (
          <button
            onClick={() => setConfirmando(true)}
            title="Excluir função"
            className="ml-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full text-faint hover:text-danger md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          >
            {iconeExcluir}
          </button>
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
                Excluir função?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
                &ldquo;{funcao.nome}&rdquo; será excluída permanentemente. Todas as
                atribuições desta função nos eventos serão removidas.
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
                  {processando ? "Excluindo..." : "Excluir função"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
