"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { iniciais } from "@/lib/iniciais";

type Membro = {
  id: string; // account id
  userId: string;
  nome: string;
  grupoNome: string;
  active: boolean;
  suspensoAte: string | null;
};

const iconeLapis = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeArquivar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

export default function MembroItem({
  membro,
  podeGerenciar,
}: {
  membro: Membro;
  podeGerenciar: boolean;
}) {
  const [mostrarSuspensao, setMostrarSuspensao] = useState(false);
  const [dataSuspensao, setDataSuspensao] = useState("");
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erroData, setErroData] = useState("");
  const router = useRouter();

  const hoje = new Date().toISOString().split("T")[0];
  const estaSuspenso = membro.suspensoAte != null && membro.suspensoAte >= hoje;

  async function suspender() {
    if (!dataSuspensao) return;
    if (dataSuspensao <= hoje) {
      setErroData("A data de suspensão precisa ser futura.");
      return;
    }
    setErroData("");
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("accounts")
      .update({ suspended_until: dataSuspensao })
      .eq("id", membro.id);
    setProcessando(false);
    setMostrarSuspensao(false);
    setDataSuspensao("");
    router.refresh();
  }

  async function removerSuspensao() {
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("accounts")
      .update({ suspended_until: null })
      .eq("id", membro.id);
    setProcessando(false);
    router.refresh();
  }

  async function arquivar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("accounts")
      .update({ active: false })
      .eq("id", membro.id);
    setProcessando(false);
    setConfirmandoArquivar(false);
    router.refresh();
  }

  async function reativar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("accounts")
      .update({ active: true })
      .eq("id", membro.id);
    setProcessando(false);
    router.refresh();
  }

  return (
    <>
      <div
        className={`group rounded-2xl border border-black/[0.06] bg-paper shadow-card px-[15px] py-3 ${
          !membro.active ? "opacity-55" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-avatar text-[14px] font-semibold text-avatar-ink">
            {iniciais(membro.nome)}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[14.5px] font-semibold text-ink">
              {membro.nome}
            </div>
            <div className="text-[12px] text-muted">{membro.grupoNome}</div>
            <div className="flex flex-wrap gap-1.5">
              {!membro.active && (
                <span className="rounded-full bg-[#E3D2B6] px-2 py-0.5 text-[10.5px] font-semibold text-[#6E5A4E]">
                  Inativo
                </span>
              )}
              {membro.active && estaSuspenso && (
                <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400e]">
                  Suspenso até{" "}
                  {new Date(membro.suspensoAte! + "T00:00").toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "2-digit" }
                  )}
                </span>
              )}
            </div>
          </div>

          {podeGerenciar && (
            <div className="ml-auto flex flex-none items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
              <Link
                href={`/membros/editar/${membro.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                title="Editar membro"
              >
                {iconeLapis}
              </Link>

              {membro.active ? (
                <>
                  {estaSuspenso ? (
                    <button
                      onClick={removerSuspensao}
                      disabled={processando}
                      className="whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-[11.5px] font-medium text-ink disabled:opacity-50"
                    >
                      Remover suspensão
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setMostrarSuspensao((v) => !v);
                        setErroData("");
                        setDataSuspensao("");
                      }}
                      className="whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-[11.5px] font-medium text-ink"
                    >
                      Suspender
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmandoArquivar(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-[#8a6200]"
                    title="Arquivar membro"
                  >
                    {iconeArquivar}
                  </button>
                </>
              ) : (
                <button
                  onClick={reativar}
                  disabled={processando}
                  className="whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-[11.5px] font-medium text-ink disabled:opacity-50"
                >
                  Reativar
                </button>
              )}
            </div>
          )}
        </div>

        {mostrarSuspensao && membro.active && !estaSuspenso && (
          <div className="mt-3 flex items-end gap-2 border-t border-black/[0.06] pt-3">
            <label className="flex-1 text-[12px] text-ink-soft">
              Suspenso até:
              <input
                type="date"
                value={dataSuspensao}
                min={hoje}
                onChange={(e) => setDataSuspensao(e.target.value)}
                className="mt-1 block w-full rounded-[12px] border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none"
              />
            </label>
            <button
              onClick={suspender}
              disabled={processando || !dataSuspensao}
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-50"
            >
              Confirmar
            </button>
          </div>
        )}
        {erroData && <p className="mt-2 text-[12px] text-danger">{erroData}</p>}
      </div>

      {confirmandoArquivar && (
        <>
          <div
            onClick={() => !processando && setConfirmandoArquivar(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">
                ARQUIVAR
              </div>
              <div className="mb-2 font-serif text-[19px] font-semibold text-ink">
                Arquivar membro?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#6E5A4E]">
                &ldquo;{membro.nome}&rdquo; ficará inativo e não será elegível
                para escalas, mas poderá ser reativado depois.
              </p>
              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  onClick={() => setConfirmandoArquivar(false)}
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
                  {processando ? "Arquivando..." : "Arquivar membro"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
