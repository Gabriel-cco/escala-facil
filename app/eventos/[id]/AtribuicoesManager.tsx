"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";

type Funcao = { id: string; nome: string };
// `id` é o id do account elegível.
type Membro = { id: string; nome: string; iniciais: string };
type Atribuicao = {
  roleId: string;
  assignmentId: string | null;
  accountId: string | null;
  accountName: string | null;
  suspendedNaData: boolean;
};

export default function AtribuicoesManager({
  eventId,
  grupoNome,
  dataLabel,
  horaLabel,
  funcoes,
  membros,
  atribuicoes,
}: {
  eventId: string;
  grupoNome: string;
  dataLabel: string;
  horaLabel: string;
  funcoes: Funcao[];
  membros: Membro[];
  atribuicoes: Atribuicao[];
}) {
  // Função (role) cuja atribuição está sendo escolhida no sheet.
  const [sheetRoleId, setSheetRoleId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();

  const porFuncao = new Map(atribuicoes.map((a) => [a.roleId, a]));
  const total = funcoes.length;
  const atribuidas = atribuicoes.filter((a) => a.accountId).length;
  const pct = total ? Math.round((atribuidas / total) * 100) : 0;

  const funcaoSheet = funcoes.find((f) => f.id === sheetRoleId);
  const atribuicaoSheet = sheetRoleId ? porFuncao.get(sheetRoleId) : undefined;

  async function atribuir(accountId: string) {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();

    // Uma atribuição por função: remove a anterior e grava a nova (Trocar).
    await supabase
      .from("assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("role_id", sheetRoleId);
    await supabase.from("assignments").insert({
      event_id: eventId,
      role_id: sheetRoleId,
      account_id: accountId,
    });

    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function remover() {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase
      .from("assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("role_id", sheetRoleId);
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  // Remove direto pela linha da função (botão "Remover"), sem abrir o sheet.
  async function removerRole(roleId: string) {
    if (ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase
      .from("assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("role_id", roleId);
    setOcupado(false);
    router.refresh();
  }

  const completo = total > 0 && atribuidas >= total;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-[22px]">
      {/* Resumo / progresso */}
      <div className="flex items-center gap-4 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-4 py-3.5 md:px-6 md:py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-ink">
            {dataLabel} · {horaLabel}
          </div>
          <div className="mt-0.5 text-[12px] text-muted">{grupoNome}</div>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-track md:w-40">
            <div
              className={`h-full rounded-full ${
                completo ? "bg-success" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">
            {atribuidas} de {total} funções
          </span>
        </div>
      </div>

      {/* Funções do grupo */}
      {total === 0 ? (
        <p className="text-[13px] text-muted">
          Nenhuma função cadastrada para o grupo deste evento.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {funcoes.map((f) => {
            const a = porFuncao.get(f.id);
            const atribuido = !!a?.accountId;
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-4 py-3"
              >
                <div className="w-[74px] flex-none text-[13.5px] font-semibold text-ink md:w-28">
                  {f.nome}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {atribuido ? (
                    <>
                      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-avatar text-[11px] font-semibold text-avatar-ink">
                        {iniciais(a?.accountName ?? "?")}
                      </div>
                      <span className="truncate text-[13.5px] text-ink">
                        {a?.accountName}
                      </span>
                      {a?.suspendedNaData && (
                        <span
                          className="flex-none text-[12px] font-semibold text-warning"
                          title="Suspenso na data do evento"
                        >
                          ⚠
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] italic text-faint">
                      Ninguém escalado ainda
                    </span>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {atribuido ? (
                    <>
                      <button
                        onClick={() => setSheetRoleId(f.id)}
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-surface"
                      >
                        Trocar
                      </button>
                      <button
                        onClick={() => removerRole(f.id)}
                        disabled={ocupado}
                        className="hidden rounded-lg border border-danger/30 px-3 py-1.5 text-[12.5px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-50 md:inline-flex"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSheetRoleId(f.id)}
                      className="rounded-lg bg-primary px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-primary-hover"
                    >
                      Atribuir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="mt-1.5 w-full rounded-2xl bg-primary py-3.5 text-[14.5px] font-semibold text-white md:hidden"
      >
        Concluir
      </button>

      {/* Sheet: seletor de membro */}
      {sheetRoleId && (
        <>
          <div
            onClick={() => setSheetRoleId(null)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto flex max-h-[76vh] w-full max-w-[440px] flex-col rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-h-[80vh] md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">
                ATRIBUIR
              </div>
              <div className="mb-3.5 font-serif text-[19px] font-semibold text-ink">
                {grupoNome} · {funcaoSheet?.nome}
              </div>

              <div className="ef-scroll flex flex-col gap-2 overflow-y-auto">
                {membros.length === 0 && (
                  <p className="py-2 text-[13px] text-muted">
                    Nenhum membro elegível (ativo e não suspenso) neste grupo.
                  </p>
                )}
                {membros.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => atribuir(m.id)}
                    disabled={ocupado}
                    className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-3.5 py-2.5 text-left disabled:opacity-50"
                  >
                    <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold text-avatar-ink">
                      {m.iniciais}
                    </div>
                    <div className="text-[14px] font-semibold text-ink">
                      {m.nome}
                    </div>
                  </button>
                ))}
              </div>

              {atribuicaoSheet?.accountId && (
                <button
                  onClick={remover}
                  disabled={ocupado}
                  className="mt-3 w-full rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-danger disabled:opacity-50"
                >
                  Remover atribuição
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
