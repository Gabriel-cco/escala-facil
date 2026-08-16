"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";
import { LiturgicalDot } from "@/app/components/LiturgicalDot";

type Funcao = { id: string; nome: string };
type Membro = { id: string; nome: string; iniciais: string };
type Atribuicao = {
  roleId: string;
  assignmentId: string | null;
  accountId: string | null;
  accountName: string | null;
  suspendedNaData: boolean;
  pendingSwapId: string | null;
  pendingSwapRequesterId: string | null;
};

export default function AtribuicoesManager({
  eventId,
  eventDate,
  groupId,
  grupoNome,
  dataLabel,
  horaLabel,
  liturgicalName,
  liturgicalColor,
  currentAccountId,
  funcoes,
  membros,
  atribuicoes,
}: {
  eventId: string;
  eventDate: string;
  groupId: string;
  grupoNome: string;
  dataLabel: string;
  horaLabel: string;
  liturgicalName: string | null;
  liturgicalColor: string | null;
  currentAccountId: string | null;
  funcoes: Funcao[];
  membros: Membro[];
  atribuicoes: Atribuicao[];
}) {
  const [sheetRoleId, setSheetRoleId] = useState<string | null>(null);
  const [swapRoleId, setSwapRoleId] = useState<string | null>(null); // modal solicitar troca
  const [swapMotivo, setSwapMotivo] = useState("");
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapErro, setSwapErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const router = useRouter();

  const porFuncao = new Map(atribuicoes.map((a) => [a.roleId, a]));
  const total = funcoes.length;
  const atribuidas = atribuicoes.filter((a) => a.accountId).length;
  const pct = total ? Math.round((atribuidas / total) * 100) : 0;

  const funcaoSheet = funcoes.find((f) => f.id === sheetRoleId);
  const atribuicaoSheet = sheetRoleId ? porFuncao.get(sheetRoleId) : undefined;
  const funcaoSwap = funcoes.find((f) => f.id === swapRoleId);
  const atribuicaoSwap = swapRoleId ? porFuncao.get(swapRoleId) : undefined;

  // Apenas coordinator/admin vê os controles de atribuição
  // (se currentAccountId nulo, assume que não é membro — não mostra nada sensível)
  const hoje = new Date().toISOString().slice(0, 10);
  const eventoPassado = eventDate < hoje;

  async function atribuir(accountId: string) {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", sheetRoleId);
    await supabase.from("assignments").insert({ event_id: eventId, role_id: sheetRoleId, account_id: accountId });
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function remover() {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", sheetRoleId);
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function removerRole(roleId: string) {
    if (ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", roleId);
    setOcupado(false);
    router.refresh();
  }

  async function solicitarTroca() {
    if (!swapRoleId || !atribuicaoSwap?.assignmentId || swapBusy) return;
    setSwapBusy(true);
    setSwapErro("");
    const res = await fetch("/api/swap-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: atribuicaoSwap.assignmentId,
        eventId,
        roleId: swapRoleId,
        reason: swapMotivo.trim() || undefined,
      }),
    });
    setSwapBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setSwapErro(b.error ?? "Erro ao solicitar troca.");
      return;
    }
    setSwapRoleId(null);
    setSwapMotivo("");
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
          {liturgicalName && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
              <LiturgicalDot color={liturgicalColor} />
              {liturgicalName}
            </div>
          )}
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-track md:w-40">
            <div
              className={`h-full rounded-full ${completo ? "bg-success" : "bg-primary"}`}
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
            const isOwn = atribuido && a?.accountId === currentAccountId;
            const hasPendingSwap = !!a?.pendingSwapId;
            const isMySwap = hasPendingSwap && a?.pendingSwapRequesterId === currentAccountId;

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
                      <span className="truncate text-[13.5px] text-ink">{a?.accountName}</span>
                      {a?.suspendedNaData && (
                        <span className="flex-none text-[12px] font-semibold text-warning" title="Suspenso na data do evento">
                          ⚠
                        </span>
                      )}
                      {hasPendingSwap && (
                        <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Troca solicitada
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] italic text-faint">Ninguém escalado ainda</span>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {atribuido ? (
                    <>
                      {/* Botões do coord/admin: Trocar e Remover */}
                      {currentAccountId && !isOwn && (
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
                      )}
                      {/* Botão do próprio membro: Solicitar troca */}
                      {isOwn && !eventoPassado && (
                        hasPendingSwap && isMySwap ? (
                          <span className="text-[12px] text-muted italic">Aguardando</span>
                        ) : !hasPendingSwap ? (
                          <button
                            onClick={() => { setSwapRoleId(f.id); setSwapMotivo(""); setSwapErro(""); }}
                            className="rounded-lg border border-primary/40 px-3 py-1.5 text-[12.5px] font-semibold text-primary hover:bg-primary/5"
                          >
                            Solicitar troca
                          </button>
                        ) : null
                      )}
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

      {/* Sheet: seletor de membro (coord/admin) */}
      {sheetRoleId && (
        <>
          <div onClick={() => setSheetRoleId(null)} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto flex max-h-[76vh] w-full max-w-[440px] flex-col rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-h-[80vh] md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">ATRIBUIR</div>
              <div className="mb-3.5 font-serif text-[19px] font-semibold text-ink">
                {grupoNome} · {funcaoSheet?.nome}
              </div>
              <div className="ef-scroll flex flex-col gap-2 overflow-y-auto">
                {membros.length === 0 && (
                  <p className="py-2 text-[13px] text-muted">Nenhum membro elegível neste grupo.</p>
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
                    <div className="text-[14px] font-semibold text-ink">{m.nome}</div>
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

      {/* Modal: solicitar troca (membro) */}
      {swapRoleId && (
        <>
          <div onClick={() => setSwapRoleId(null)} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">SOLICITAR TROCA</div>
              <div className="mb-1 font-serif text-[19px] font-semibold text-ink">
                {funcaoSwap?.nome}
              </div>
              <div className="mb-4 text-[13px] text-muted">
                {grupoNome} · {dataLabel}
              </div>
              <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">
                Motivo (opcional)
              </label>
              <textarea
                value={swapMotivo}
                onChange={(e) => setSwapMotivo(e.target.value)}
                placeholder="Ex.: vou viajar nesse fim de semana"
                rows={3}
                className="mb-1 w-full rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              {swapErro && (
                <p className="mb-2 text-[12.5px] text-danger">{swapErro}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setSwapRoleId(null)}
                  className="flex-1 rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink"
                >
                  Cancelar
                </button>
                <button
                  onClick={solicitarTroca}
                  disabled={swapBusy}
                  className="flex-1 rounded-[14px] bg-primary py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {swapBusy ? "Enviando..." : "Solicitar troca"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
