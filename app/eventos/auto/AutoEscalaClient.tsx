"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { PropostaSlot } from "@/lib/auto-escala";

type EventoItem = {
  id: string;
  name: string;
  date: string;
  time: string | null;
  totalFuncoes: number;
  atribuidas: number;
};

function labelMes(mesKey: string) {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const [ano, mes] = mesKey.split("-");
  return `${meses[parseInt(mes) - 1]} ${ano}`;
}

function labelData(date: string, time: string | null) {
  const d = new Date(`${date}T12:00:00`);
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const hora = time ? ` · ${time.slice(0, 5)}` : "";
  return `${dias[d.getDay()]}, ${date.slice(8, 10)}/${date.slice(5, 7)}${hora}`;
}

function slotKey(slot: PropostaSlot) {
  return `${slot.eventId}::${slot.roleId}`;
}

function DiasTag({ dias, taxa }: { dias: number; taxa: number }) {
  const diasStr = dias >= 999 ? "Nunca escalado" : `${dias}d`;
  const taxaStr = `${Math.round(taxa * 100)}%`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] text-muted">
      {diasStr} · {taxaStr}
    </span>
  );
}

export default function AutoEscalaClient({
  groupId,
  grupoNome,
  eventos,
}: {
  groupId: string;
  grupoNome: string;
  eventos: EventoItem[];
}) {
  const [fase, setFase] = useState<"selecao" | "gerando" | "rascunho" | "confirmado">("selecao");
  const [selecionados, setSelecionados] = useState<Set<string>>(
    () => new Set(eventos.filter((e) => e.atribuidas < e.totalFuncoes || e.totalFuncoes === 0).map((e) => e.id))
  );
  const [propostas, setPropostas] = useState<PropostaSlot[]>([]);
  const [ressorteiando, setRessorteiando] = useState<Set<string>>(new Set());
  const [sheetSlot, setSheetSlot] = useState<PropostaSlot | null>(null);
  const [sheetBusca, setSheetBusca] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");

  // Agrupa eventos por mês
  const eventosPorMes = useMemo(() => {
    const map = new Map<string, EventoItem[]>();
    for (const e of eventos) {
      const key = e.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [eventos]);

  // Agrupa propostas por evento
  const propostasPorEvento = useMemo(() => {
    const map = new Map<string, PropostaSlot[]>();
    for (const p of propostas) {
      if (!map.has(p.eventId)) map.set(p.eventId, []);
      map.get(p.eventId)!.push(p);
    }
    return map;
  }, [propostas]);

  // Eventos únicos nas propostas (mantendo ordem por data)
  const eventosNasPropostas = useMemo(() => {
    const vistos = new Set<string>();
    const result: { id: string; name: string; date: string; time?: string | null }[] = [];
    for (const p of propostas) {
      if (!vistos.has(p.eventId)) {
        vistos.add(p.eventId);
        result.push({ id: p.eventId, name: p.eventName, date: p.eventDate });
      }
    }
    return result;
  }, [propostas]);

  async function gerar(eventIds: string[]) {
    setFase("gerando");
    setErro("");
    try {
      const res = await fetch("/api/escala/auto/rascunho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, eventIds }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErro(data.error ?? "Erro ao gerar.");
        setFase("selecao");
        return;
      }
      setPropostas(data.propostas ?? []);
      setFase("rascunho");
    } catch {
      setErro("Erro de rede. Tente novamente.");
      setFase("selecao");
    }
  }

  async function resortear(slot: PropostaSlot) {
    const key = slotKey(slot);
    setRessorteiando((prev) => new Set([...prev, key]));
    try {
      const excludeIds = propostas
        .filter((p) => p.eventId === slot.eventId && slotKey(p) !== key && p.accountId)
        .map((p) => p.accountId!);

      const res = await fetch("/api/escala/auto/resortear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          eventId: slot.eventId,
          eventDate: slot.eventDate,
          eventName: slot.eventName,
          roleId: slot.roleId,
          roleName: slot.roleName,
          excludeIds,
        }),
      });
      const data = await res.json();
      if (data.slot) {
        setPropostas((prev) => prev.map((p) => (slotKey(p) === key ? data.slot : p)));
      }
    } finally {
      setRessorteiando((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function trocarManual(slot: PropostaSlot, accountId: string, accountName: string) {
    const key = slotKey(slot);
    setPropostas((prev) =>
      prev.map((p) =>
        slotKey(p) === key ? { ...p, accountId, accountName, dias: 0, taxa: 0 } : p
      )
    );
    setSheetSlot(null);
    setSheetBusca("");
  }

  async function confirmar() {
    setConfirmando(true);
    setErro("");
    try {
      const res = await fetch("/api/escala/auto/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostas }),
      });
      const data = await res.json();
      if (data.ok) {
        setFase("confirmado");
      } else {
        setErro(data.error ?? "Erro ao confirmar.");
      }
    } catch {
      setErro("Erro de rede. Tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  // ── Fase: seleção ────────────────────────────────────────────────────────
  if (fase === "selecao") {
    const todosIds = eventos.map((e) => e.id);
    const todosMarcados = todosIds.every((id) => selecionados.has(id));

    return (
      <div className="flex flex-col gap-4 py-3">
        {erro && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{erro}</p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted">
            {selecionados.size === 0
              ? "Nenhum evento selecionado"
              : `${selecionados.size} evento${selecionados.size > 1 ? "s" : ""} selecionado${selecionados.size > 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() =>
              setSelecionados(todosMarcados ? new Set() : new Set(todosIds))
            }
            className="text-[13px] font-medium text-primary"
          >
            {todosMarcados ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>

        {eventos.length === 0 && (
          <p className="rounded-xl border border-black/10 px-4 py-4 text-center text-[13px] text-muted">
            Nenhum evento nos próximos 120 dias.
          </p>
        )}

        {[...eventosPorMes.entries()].map(([mesKey, evs]) => (
          <div key={mesKey} className="flex flex-col gap-1.5">
            <p className="px-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              {labelMes(mesKey)}
            </p>
            {evs.map((e) => {
              const checked = selecionados.has(e.id);
              const completo = e.totalFuncoes > 0 && e.atribuidas >= e.totalFuncoes;
              return (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-black/10 bg-paper px-4 py-3 transition-colors hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(ev) =>
                      setSelecionados((prev) => {
                        const next = new Set(prev);
                        if (ev.target.checked) next.add(e.id);
                        else next.delete(e.id);
                        return next;
                      })
                    }
                    className="mt-0.5 h-4 w-4 flex-none accent-primary"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-medium text-ink">{e.name}</span>
                    <span className="mt-0.5 text-[12px] text-muted">
                      {labelData(e.date, e.time)}
                    </span>
                  </div>
                  {completo ? (
                    <span className="mt-0.5 flex-none rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      Completa
                    </span>
                  ) : e.totalFuncoes > 0 ? (
                    <span className="mt-0.5 flex-none rounded-full bg-black/[0.06] px-2 py-0.5 text-[11px] text-muted">
                      {e.atribuidas}/{e.totalFuncoes}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        ))}

        <button
          disabled={selecionados.size === 0}
          onClick={() => gerar([...selecionados])}
          className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          Gerar escala automática
        </button>

        <p className="text-center text-[12px] text-muted">
          O sorteio é ponderado: quem ficou mais tempo sem escalar e tem melhor
          presença tem mais chance de ser sorteado.
        </p>
      </div>
    );
  }

  // ── Fase: gerando ────────────────────────────────────────────────────────
  if (fase === "gerando") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-primary" />
        <p className="text-[14px] text-muted">Calculando pesos e sorteando...</p>
      </div>
    );
  }

  // ── Fase: confirmado ─────────────────────────────────────────────────────
  if (fase === "confirmado") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <span className="text-2xl">✓</span>
        </div>
        <div>
          <p className="text-[16px] font-semibold text-ink">Escala confirmada!</p>
          <p className="mt-1 text-[13px] text-muted">
            As atribuições foram salvas com sucesso.
          </p>
        </div>
        <Link
          href="/eventos"
          className="mt-2 rounded-2xl bg-primary px-6 py-3 text-[14.5px] font-semibold text-white"
        >
          Ver eventos
        </Link>
      </div>
    );
  }

  // ── Fase: rascunho ───────────────────────────────────────────────────────
  const totalComPessoa = propostas.filter((p) => p.accountId).length;

  return (
    <>
      <div className="flex flex-col gap-4 py-3 pb-24">
        {/* Info bar */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[13px] font-medium text-primary">
            {totalComPessoa} atribuição{totalComPessoa !== 1 ? "ões" : ""} gerada
            {totalComPessoa !== 1 ? "s" : ""} — revise antes de confirmar
          </p>
          <p className="mt-0.5 text-[12px] text-primary/70">
            Nenhuma alteração é salva até você clicar em &ldquo;Confirmar&rdquo;.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setFase("selecao");
              setPropostas([]);
            }}
            className="text-[13px] font-medium text-ink-soft"
          >
            ← Novo sorteio
          </button>
          <span className="text-[12px] text-muted">{grupoNome}</span>
        </div>

        {erro && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{erro}</p>
        )}

        {/* Eventos */}
        {eventosNasPropostas.map((ev) => {
          const slots = propostasPorEvento.get(ev.id) ?? [];
          const dataEvento = eventos.find((e) => e.id === ev.id);
          return (
            <div key={ev.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between px-0.5">
                <p className="text-[14px] font-semibold text-ink">{ev.name}</p>
                {dataEvento && (
                  <p className="text-[12px] text-muted">
                    {labelData(ev.date, dataEvento.time ?? null)}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {slots.map((slot) => {
                  const key = slotKey(slot);
                  const girando = ressorteiando.has(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-[14px] border border-black/10 bg-paper px-4 py-3"
                    >
                      {/* Função */}
                      <div className="min-w-[90px] flex-none">
                        <p className="text-[12px] font-medium text-muted">{slot.roleName}</p>
                      </div>

                      {/* Pessoa + metadata */}
                      <div className="flex flex-1 flex-col">
                        {slot.accountId ? (
                          <>
                            <p className="text-[14px] font-medium text-ink">{slot.accountName}</p>
                            <DiasTag dias={slot.dias} taxa={slot.taxa} />
                          </>
                        ) : (
                          <p className="text-[13px] text-danger">Sem elegíveis</p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-none items-center gap-2">
                        <button
                          disabled={girando}
                          onClick={() => resortear(slot)}
                          title="Resortear"
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[15px] text-muted transition-colors hover:bg-surface ${girando ? "animate-spin opacity-50" : ""}`}
                        >
                          ↻
                        </button>
                        {slot.eligiveis.length > 0 && (
                          <button
                            onClick={() => {
                              setSheetSlot(slot);
                              setSheetBusca("");
                            }}
                            title="Trocar manualmente"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[13px] text-muted transition-colors hover:bg-surface"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra fixa de confirmação */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col gap-2 border-t border-black/10 bg-white/90 px-[18px] pb-6 pt-3 backdrop-blur md:left-[220px]">
        {erro && (
          <p className="text-center text-[12px] text-danger">{erro}</p>
        )}
        <button
          disabled={confirmando || totalComPessoa === 0}
          onClick={confirmar}
          className="w-full rounded-2xl bg-primary py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {confirmando ? "Salvando..." : `Confirmar ${totalComPessoa} atribuição${totalComPessoa !== 1 ? "ões" : ""}`}
        </button>
      </div>

      {/* Sheet: troca manual */}
      {sheetSlot && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => {
              setSheetSlot(null);
              setSheetBusca("");
            }}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
            <div className="flex w-full max-w-[440px] flex-col rounded-t-[26px] bg-white pb-8 pt-3.5 md:max-h-[70vh] md:rounded-2xl">
              <div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="px-5">
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
                  Trocar membro
                </p>
                <p className="mb-3 text-[15px] font-semibold text-ink">{sheetSlot.roleName}</p>
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar por nome..."
                  value={sheetBusca}
                  onChange={(e) => setSheetBusca(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-black/10 bg-surface px-3.5 py-2.5 text-[14px] outline-none placeholder:text-muted focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto px-5">
                {sheetSlot.eligiveis
                  .filter((e) =>
                    sheetBusca.trim() === "" ||
                    e.nome.toLowerCase().includes(sheetBusca.toLowerCase())
                  )
                  .map((e) => (
                    <button
                      key={e.id}
                      onClick={() => trocarManual(sheetSlot, e.id, e.nome)}
                      className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors hover:bg-surface ${e.id === sheetSlot.accountId ? "bg-primary/10" : ""}`}
                    >
                      <span className="flex-1 text-[14px] font-medium text-ink">{e.nome}</span>
                      {e.id === sheetSlot.accountId && (
                        <span className="text-[12px] text-primary">Atual</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
