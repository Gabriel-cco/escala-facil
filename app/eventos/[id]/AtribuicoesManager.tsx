"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Funcao = { id: string; nome: string };
type Membro = { id: string; nome: string; iniciais: string };
type Atribuicao = {
  roleId: string;
  assignmentId: string | null;
  memberId: string | null;
  memberName: string | null;
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
  const atribuidas = atribuicoes.filter((a) => a.memberId).length;
  const pct = total ? Math.round((atribuidas / total) * 100) : 0;

  const funcaoSheet = funcoes.find((f) => f.id === sheetRoleId);
  const atribuicaoSheet = sheetRoleId ? porFuncao.get(sheetRoleId) : undefined;

  async function atribuir(membroId: string) {
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
      member_id: membroId,
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

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-[22px]">
      {/* Resumo / progresso */}
      <div className="rounded-[18px] bg-surface p-[18px] md:flex md:items-center md:gap-6 md:border md:border-black/[0.06] md:bg-paper md:px-6 md:py-5">
        <div className="md:flex-1">
          <div className="mb-1.5 text-[12.5px] font-semibold text-ink-soft md:mb-0 md:text-[13px]">
            {dataLabel} · {horaLabel}
          </div>
          <div className="mt-2 text-[12px] text-[#7a7a77] md:order-last md:mt-1 md:text-[13px] md:text-muted">
            {atribuidas} de {total} funções atribuídas
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2.5 md:mt-0 md:w-[260px] md:flex-none">
          <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-track md:h-2 md:bg-surface">
            <div
              className="h-full rounded-[3px] bg-ink"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Funções do grupo */}
      {total === 0 ? (
        <p className="text-[13px] text-muted">
          Nenhuma função cadastrada para o grupo deste evento.
        </p>
      ) : (
        <div>
          <div className="mb-2 px-1 pt-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint md:mb-2.5 md:px-0 md:pt-0">
            {grupoNome}
          </div>
          <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-2.5">
          {funcoes.map((f) => {
            const a = porFuncao.get(f.id);
            const atribuido = !!a?.memberId;
            return (
              <button
                key={f.id}
                onClick={() => setSheetRoleId(f.id)}
                className={`flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-black/[0.06] px-[15px] py-3.5 text-left ${
                  atribuido ? "bg-ink" : "bg-paper"
                }`}
              >
                <div className="flex flex-col gap-[3px]">
                  <div
                    className={`text-[14px] font-semibold ${
                      atribuido ? "text-paper" : "text-ink"
                    }`}
                  >
                    {f.nome}
                  </div>
                  {atribuido && (
                    <div className="text-[12px] text-white/60">
                      {a?.memberName}
                    </div>
                  )}
                </div>
                <div
                  className={`whitespace-nowrap text-[12px] font-semibold ${
                    atribuido ? "text-white/60" : "text-ink-soft"
                  }`}
                >
                  {atribuido ? "Trocar" : "Atribuir +"}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="mt-1.5 w-full rounded-2xl bg-ink py-3.5 text-[14.5px] font-semibold text-paper md:hidden"
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
            <div className="ef-sheet mx-auto mt-auto flex max-h-[76vh] w-full max-w-[440px] flex-col rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-h-[80vh] md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
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
                    className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper px-3.5 py-2.5 text-left disabled:opacity-50"
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

              {atribuicaoSheet?.memberId && (
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
