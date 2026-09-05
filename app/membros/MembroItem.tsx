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
  email: string;
  perfil: "admin" | "coordinator" | "member";
  grupoNome: string;
  active: boolean;
  suspensoAte: string | null;
  motivoSuspensao: string | null;
  birthDate: string | null;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
  responsavelEmail: string | null;
  termoAssinado: boolean;
  termoData: string | null;
};

function ehMenorDeIdade(dataNascimento: string): boolean {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const diffMes = hoje.getMonth() - nascimento.getMonth();
  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade < 18;
}

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

const BTN_TEXTO = "whitespace-nowrap rounded-full border border-black/10 px-2.5 py-1 text-[11.5px] font-medium text-ink disabled:opacity-50";

function badgePerfil(perfil: "admin" | "coordinator" | "member") {
  if (perfil === "admin")
    return <span className="rounded-full bg-[#F2E7D4] px-2 py-0.5 text-[10.5px] font-semibold text-[#6B3521]">Admin</span>;
  if (perfil === "coordinator")
    return <span className="rounded-full bg-[#E3D2B6] px-2 py-0.5 text-[10.5px] font-semibold text-[#4A3A31]">Coordenador</span>;
  return null;
}

export default function MembroItem({
  membro,
  podeGerenciar,
  podeVerPerfil,
  currentAccountId,
}: {
  membro: Membro;
  podeGerenciar: boolean;
  podeVerPerfil: boolean;
  currentAccountId: string;
}) {
  const [mostrarSuspensao, setMostrarSuspensao] = useState(false);
  const [editandoSuspensao, setEditandoSuspensao] = useState(false);
  const [dataSuspensao, setDataSuspensao] = useState("");
  const [motivoSuspensao, setMotivoSuspensao] = useState("");
  const [confirmandoSuspensao, setConfirmandoSuspensao] = useState(false);
  const [confirmandoInativar, setConfirmandoInativar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erroData, setErroData] = useState("");
  const router = useRouter();

  const hoje = new Date().toISOString().split("T")[0];
  const estaSuspenso = membro.suspensoAte != null && membro.suspensoAte >= hoje;
  const ehContaPropria = membro.id === currentAccountId;

  function abrirEdicaoSuspensao() {
    setDataSuspensao(membro.suspensoAte ?? "");
    setMotivoSuspensao(membro.motivoSuspensao ?? "");
    setErroData("");
    setEditandoSuspensao(true);
  }

  function pedirConfirmacaoSuspensao() {
    if (!dataSuspensao) return;
    if (dataSuspensao <= hoje) {
      setErroData("A data de suspensão precisa ser futura.");
      return;
    }
    setErroData("");
    setConfirmandoSuspensao(true);
  }

  async function suspender() {
    setProcessando(true);
    await fetch(`/api/accounts/${membro.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended_until: dataSuspensao, suspension_reason: motivoSuspensao }),
    });
    setProcessando(false);
    setConfirmandoSuspensao(false);
    setMostrarSuspensao(false);
    setEditandoSuspensao(false);
    setDataSuspensao("");
    setMotivoSuspensao("");
    router.refresh();
  }

  async function removerSuspensao() {
    setProcessando(true);
    const supabase = createClient();
    await supabase.from("accounts").update({ suspended_until: null }).eq("id", membro.id);
    setProcessando(false);
    router.refresh();
  }

  async function inativar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase.from("accounts").update({ active: false }).eq("id", membro.id);
    setProcessando(false);
    setConfirmandoInativar(false);
    router.refresh();
  }

  async function reativar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase.from("accounts").update({ active: true }).eq("id", membro.id);
    setProcessando(false);
    router.refresh();
  }

  // Botões de texto — renderizados em dois contextos: mobile (2ª linha) e desktop (hover direita)
  function botoesTexto() {
    if (!membro.active) {
      return (
        <button onClick={reativar} disabled={processando} className={BTN_TEXTO}>
          Reativar
        </button>
      );
    }
    if (membro.perfil !== "member") return null;
    if (estaSuspenso) {
      return (
        <>
          <button onClick={abrirEdicaoSuspensao} className={BTN_TEXTO}>
            Editar suspensão
          </button>
          <button onClick={removerSuspensao} disabled={processando} className={BTN_TEXTO}>
            Remover
          </button>
        </>
      );
    }
    return (
      <button
        onClick={() => { setMostrarSuspensao((v) => !v); setErroData(""); setDataSuspensao(""); setMotivoSuspensao(""); }}
        className={BTN_TEXTO}
      >
        Suspender
      </button>
    );
  }

  const temBotoesTexto = !membro.active || membro.perfil === "member";

  return (
    <>
      <div
        className={`group rounded-2xl border border-black/[0.06] bg-paper shadow-card px-[15px] py-3 ${
          !membro.active ? "opacity-55" : ""
        }`}
      >
        {/* Linha principal: avatar · info · ações ícone */}
        <div className="flex items-start gap-3">
          <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-avatar text-[14px] font-semibold text-avatar-ink">
            {iniciais(membro.nome)}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[14.5px] font-semibold text-ink">{membro.nome}</div>
            {/* truncate impede email longo de empurrar os botões */}
            <div className="truncate text-[12px] text-muted">{membro.email}</div>
            <div className="text-[11.5px] text-faint">{membro.grupoNome}</div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {podeVerPerfil && badgePerfil(membro.perfil)}
              {!membro.active && (
                <span className="rounded-full bg-[#E3D2B6] px-2 py-0.5 text-[10.5px] font-semibold text-[#6E5A4E]">
                  Inativo
                </span>
              )}
              {membro.active && estaSuspenso && (
                <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400e]">
                  Suspenso até{" "}
                  {new Date(membro.suspensoAte! + "T00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Ícones (lápis + arquivar) — sempre visíveis. Desktop: oculto até hover. */}
          {podeGerenciar && (
            <div className="flex flex-none items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
              <Link
                href={`/membros/editar/${membro.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                title="Editar"
              >
                {iconeLapis}
              </Link>

              {/* Botões de texto — desktop apenas, no hover */}
              {temBotoesTexto && (
                <div className="hidden items-center gap-0.5 md:flex">
                  {botoesTexto()}
                </div>
              )}

              {membro.active && (
                <button
                  onClick={() => !ehContaPropria && setConfirmandoInativar(true)}
                  disabled={ehContaPropria}
                  title={ehContaPropria ? "Não é possível inativar a própria conta" : undefined}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-[#8a6200] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {iconeArquivar}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Botões de texto — mobile apenas, segunda linha abaixo do conteúdo */}
        {podeGerenciar && temBotoesTexto && (
          <div className="mt-2 flex flex-wrap gap-1.5 md:hidden">
            {botoesTexto()}
          </div>
        )}

        {/* Seção responsável — apenas para menores, só admin/coordinator */}
        {podeGerenciar && membro.birthDate && ehMenorDeIdade(membro.birthDate) && (
          <div className="mt-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-amber-700">
              Responsável
            </div>
            <div className="text-[12.5px] text-ink">
              {membro.responsavelNome ?? <span className="text-muted italic">não informado</span>}
            </div>
            {membro.responsavelTelefone && (
              <div className="mt-0.5 text-[12px] text-muted">
                {membro.responsavelTelefone}
                {membro.responsavelEmail && ` · ${membro.responsavelEmail}`}
              </div>
            )}
            <div className="mt-1.5 text-[11.5px]">
              {membro.termoAssinado ? (
                <span className="text-green-700">
                  ✅ Termo assinado
                  {membro.termoData && ` em ${new Date(membro.termoData + "T00:00").toLocaleDateString("pt-BR")}`}
                </span>
              ) : (
                <span className="text-amber-700">⚠️ Termo não assinado</span>
              )}
            </div>
          </div>
        )}

        {/* Formulário de suspensão (expandido) */}
        {(mostrarSuspensao || editandoSuspensao) && membro.active && (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-black/[0.06] pt-3">
            <label className="text-[12px] text-ink-soft">
              Suspenso até:
              <input
                type="date"
                value={dataSuspensao}
                min={hoje}
                onChange={(e) => setDataSuspensao(e.target.value)}
                className="mt-1 block w-full rounded-[12px] border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none"
              />
            </label>
            <label className="text-[12px] text-ink-soft">
              Motivo (opcional):
              <textarea
                value={motivoSuspensao}
                onChange={(e) => setMotivoSuspensao(e.target.value)}
                rows={2}
                placeholder="Ex: falta de comprometimento"
                className="mt-1 block w-full resize-none rounded-[12px] border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none placeholder:text-faint"
              />
            </label>
            <div className="flex justify-end gap-2">
              {editandoSuspensao && (
                <button
                  onClick={() => setEditandoSuspensao(false)}
                  className="rounded-full border border-black/10 px-4 py-2 text-[13px] font-semibold text-ink"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={pedirConfirmacaoSuspensao}
                disabled={!dataSuspensao}
                className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
        {erroData && <p className="mt-2 text-[12px] text-danger">{erroData}</p>}
      </div>

      {confirmandoSuspensao && (
        <>
          <div
            onClick={() => !processando && setConfirmandoSuspensao(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">SUSPENDER</div>
              <div className="mb-2 text-[19px] font-semibold text-ink">
                {editandoSuspensao ? "Editar suspensão?" : "Suspender membro?"}
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#6E5A4E]">
                {editandoSuspensao
                  ? `Você está prestes a alterar a suspensão de "${membro.nome}". Deseja continuar e notificá-lo?`
                  : `Você está prestes a suspender "${membro.nome}". Deseja continuar a operação e notificá-lo?`}
              </p>
              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  onClick={() => setConfirmandoSuspensao(false)}
                  disabled={processando}
                  className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={suspender}
                  disabled={processando}
                  className="rounded-[14px] bg-primary py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {processando ? "Suspendendo..." : "Confirmar e notificar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmandoInativar && (
        <>
          <div
            onClick={() => !processando && setConfirmandoInativar(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">INATIVAR</div>
              <div className="mb-2 text-[19px] font-semibold text-ink">Inativar pessoa?</div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#6E5A4E]">
                &ldquo;{membro.nome}&rdquo; perderá o acesso e não será elegível
                para escalas, mas poderá ser reativado depois.
              </p>
              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  onClick={() => setConfirmandoInativar(false)}
                  disabled={processando}
                  className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={inativar}
                  disabled={processando}
                  className="rounded-[14px] bg-[#8a6200] py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {processando ? "Inativando..." : "Inativar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
