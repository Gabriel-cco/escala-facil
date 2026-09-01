"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";
import { LiturgicalDot } from "@/app/components/LiturgicalDot";
import { logAccess } from "@/lib/access-log";

type Funcao = { id: string; nome: string; assignmentType: "pessoa" | "ministerio" };
type Membro = { id: string; nome: string; iniciais: string };
type Ministerio = { id: string; name: string };
type Atribuicao = {
  roleId: string;
  assignmentId: string | null;
  accountId: string | null;
  accountName: string | null;
  ministerioId: string | null;
  ministerioName: string | null;
  suspendedNaData: boolean;
  pendingSwapId: string | null;
  pendingSwapRequesterId: string | null;
};

export default function AtribuicoesManager({
  eventId,
  eventDate,
  grupoNome,
  dataLabel,
  horaLabel,
  liturgicalName,
  liturgicalColor,
  currentAccountId,
  funcoes,
  membros,
  ministerios = [],
  membrosElegiveisPorFuncao = {},
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
  ministerios?: Ministerio[];
  membrosElegiveisPorFuncao?: Record<string, string[]>;
  atribuicoes: Atribuicao[];
}) {
  const [sheetRoleId, setSheetRoleId] = useState<string | null>(null);
  const [swapRoleId, setSwapRoleId] = useState<string | null>(null);
  const [swapMotivo, setSwapMotivo] = useState("");
  const [swapBusy, setSwapBusy] = useState(false);
  const [swapErro, setSwapErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [notificando, setNotificando] = useState(false);
  const [notifyErro, setNotifyErro] = useState("");
  const router = useRouter();

  useEffect(() => {
    const isOpen = !!sheetRoleId || !!swapRoleId;
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSheetRoleId(null);
        setSwapRoleId(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetRoleId, swapRoleId]);

  const porFuncao = new Map(atribuicoes.map((a) => [a.roleId, a]));
  const total = funcoes.length;
  const atribuidas = atribuicoes.filter((a) => a.accountId || a.ministerioId).length;
  const pct = total ? Math.round((atribuidas / total) * 100) : 0;

  const funcaoSheet = funcoes.find((f) => f.id === sheetRoleId);
  const atribuicaoSheet = sheetRoleId ? porFuncao.get(sheetRoleId) : undefined;
  const funcaoSwap = funcoes.find((f) => f.id === swapRoleId);
  const atribuicaoSwap = swapRoleId ? porFuncao.get(swapRoleId) : undefined;

  const hoje = new Date().toISOString().slice(0, 10);
  const eventoPassado = eventDate < hoje;

  async function atribuir(accountId: string) {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", sheetRoleId);
    await supabase.from("assignments").insert({ event_id: eventId, role_id: sheetRoleId, account_id: accountId });
    if (currentAccountId) logAccess(currentAccountId, "atribuir_membro", { event_id: eventId, role_id: sheetRoleId });
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function atribuirMinisterio(ministerioId: string) {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", sheetRoleId);
    await supabase.from("assignments").insert({ event_id: eventId, role_id: sheetRoleId, account_id: null, ministerio_id: ministerioId });
    if (currentAccountId) logAccess(currentAccountId, "atribuir_ministerio", { event_id: eventId, role_id: sheetRoleId });
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function remover() {
    if (!sheetRoleId || ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", sheetRoleId);
    if (currentAccountId) logAccess(currentAccountId, "remover_atribuicao", { event_id: eventId, role_id: sheetRoleId });
    setOcupado(false);
    setSheetRoleId(null);
    router.refresh();
  }

  async function removerRole(roleId: string) {
    if (ocupado) return;
    setOcupado(true);
    const supabase = createClient();
    await supabase.from("assignments").delete().eq("event_id", eventId).eq("role_id", roleId);
    if (currentAccountId) logAccess(currentAccountId, "remover_atribuicao", { event_id: eventId, role_id: roleId });
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
    if (currentAccountId) logAccess(currentAccountId, "solicitar_troca", { event_id: eventId, role_id: swapRoleId });
    setSwapRoleId(null);
    setSwapMotivo("");
    router.refresh();
  }

  async function concluirENotificar() {
    if (notificando || atribuidas === 0) return;
    setNotificando(true);
    setNotifyErro("");
    const res = await fetch(`/api/events/${eventId}/notify`, {
      method: "POST",
      credentials: "include",
    });
    setNotificando(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setNotifyErro(b.error ?? "Erro ao notificar os escalados.");
      return;
    }
    router.back();
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
            const ehMinisterio = f.assignmentType === "ministerio";
            const atribuido = ehMinisterio ? !!a?.ministerioId : !!a?.accountId;
            const isOwn = !ehMinisterio && atribuido && a?.accountId === currentAccountId;
            const hasPendingSwap = !ehMinisterio && !!a?.pendingSwapId;
            const isMySwap = hasPendingSwap && a?.pendingSwapRequesterId === currentAccountId;
            const displayName = ehMinisterio ? a?.ministerioName : a?.accountName;

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
                      {ehMinisterio ? (
                        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface text-[11px] text-muted">
                          ♪
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-avatar text-[11px] font-semibold text-avatar-ink">
                          {iniciais(a?.accountName ?? "?")}
                        </div>
                      )}
                      <span className="truncate text-[13.5px] text-ink">{displayName}</span>
                      {!ehMinisterio && a?.suspendedNaData && (
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
                    <span className="text-[13px] italic text-faint">
                      {ehMinisterio ? "Nenhum ministério escalado" : "Ninguém escalado ainda"}
                    </span>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {atribuido ? (
                    <>
                      {/* Coord/admin: Trocar e Remover */}
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
                      {/* Solicitar troca: só para funções do tipo pessoa */}
                      {!ehMinisterio && isOwn && !eventoPassado && (
                        hasPendingSwap && isMySwap ? (
                          <span className="text-[12px] italic text-muted">Aguardando</span>
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

      {/* Concluir */}
      <div className="mt-1.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
        {notifyErro && (
          <p className="text-[12.5px] text-danger md:mr-auto md:self-center">{notifyErro}</p>
        )}
        <button
          onClick={() => router.back()}
          className="w-full rounded-2xl border border-black/10 py-3.5 text-[14.5px] font-semibold text-ink hover:bg-surface md:w-auto md:rounded-[14px] md:px-6 md:py-3"
        >
          Concluir sem notificar
        </button>
        <button
          onClick={concluirENotificar}
          disabled={notificando || atribuidas === 0}
          title={atribuidas === 0 ? "Nenhuma função atribuída ainda" : undefined}
          className="w-full rounded-2xl bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 md:w-auto md:rounded-[14px] md:px-6 md:py-3"
        >
          {notificando ? "Enviando..." : "Concluir e notificar"}
        </button>
      </div>

      {/* Sheet: seletor de membro OU ministério */}
      {sheetRoleId && (
        <>
          <div onClick={() => setSheetRoleId(null)} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto flex max-h-[76vh] w-full max-w-[440px] flex-col rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-h-[80vh] md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[12px] tracking-[0.4px] text-muted">ATRIBUIR</div>
                <button
                  onClick={() => setSheetRoleId(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
              <div className="mb-3.5 text-[19px] font-semibold text-ink">
                {grupoNome} · {funcaoSheet?.nome}
              </div>
              <div className="ef-scroll flex flex-col gap-2 overflow-y-auto overscroll-contain">
                {funcaoSheet?.assignmentType === "ministerio" ? (
                  ministerios.length === 0 ? (
                    <p className="py-2 text-[13px] text-muted">Nenhum ministério cadastrado neste grupo.</p>
                  ) : (
                    ministerios.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => atribuirMinisterio(m.id)}
                        disabled={ocupado}
                        className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-3.5 py-2.5 text-left disabled:opacity-50"
                      >
                        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-surface text-[16px]">
                          ♪
                        </div>
                        <div className="text-[14px] font-semibold text-ink">{m.name}</div>
                      </button>
                    ))
                  )
                ) : (() => {
                  const membrosSheet = sheetRoleId && membrosElegiveisPorFuncao[sheetRoleId]
                    ? membros.filter((m) => membrosElegiveisPorFuncao[sheetRoleId].includes(m.id))
                    : membros;
                  return membrosSheet.length === 0 ? (
                    <p className="py-2 text-[13px] text-muted">
                      {sheetRoleId && membrosElegiveisPorFuncao[sheetRoleId]
                        ? "Nenhum membro com a qualificação exigida."
                        : "Nenhum membro elegível neste grupo."}
                    </p>
                  ) : membrosSheet.map((m) => (
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
                  ));
                })()}
              </div>
              {(atribuicaoSheet?.accountId || atribuicaoSheet?.ministerioId) && (
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

      {/* Modal: solicitar troca (membro — só tipo pessoa) */}
      {swapRoleId && (
        <>
          <div onClick={() => setSwapRoleId(null)} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">SOLICITAR TROCA</div>
              <div className="mb-1 text-[19px] font-semibold text-ink">
                {funcaoSwap?.nome}
              </div>
              <div className="mb-4 text-[13px] text-muted">
                {grupoNome} · {dataLabel}
              </div>
              <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">
                Motivo <span className="text-danger">*</span>
              </label>
              <textarea
                value={swapMotivo}
                onChange={(e) => setSwapMotivo(e.target.value)}
                placeholder="Ex.: vou viajar nesse fim de semana"
                rows={3}
                className="mb-1 w-full resize-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {swapMotivo.trim().length === 0 && (
                <p className="mb-1 text-[12px] text-muted">Descreva o motivo da troca.</p>
              )}
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
                  disabled={swapBusy || swapMotivo.trim().length < 3}
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
