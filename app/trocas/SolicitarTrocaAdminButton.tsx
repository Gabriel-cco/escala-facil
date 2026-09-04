"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Evento = {
  id: string;
  name: string;
  date: string;
  ministerio_id: string | null;
  ministerio_nome: string | null;
};

type Atribuicao = {
  id: string;
  role_id: string;
  role_name: string;
  member_name: string;
};

const MESES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function formatarData(d: string) {
  const [, m, dia] = d.split("-").map(Number);
  return `${dia} ${MESES_CURTO[m - 1]}`;
}

export default function SolicitarTrocaAdminButton({ groupId }: { groupId: string }) {
  const [aberto, setAberto] = useState(false);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoSel, setEventoSel] = useState("");
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [atribuicaoSel, setAtribuicaoSel] = useState("");
  const [carregandoAtr, setCarregandoAtr] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  // Carrega eventos ao abrir
  useEffect(() => {
    if (!aberto || !groupId) return;
    const supabase = createClient();
    const hoje = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, name, date, ministerio_id, ministerio:ministerios(name)")
      .eq("group_id", groupId)
      .gte("date", hoje)
      .order("date")
      .then(({ data }) => {
        const evts: Evento[] = (data ?? []).map((e) => {
          const min = Array.isArray(e.ministerio) ? e.ministerio[0] : e.ministerio;
          return {
            id: e.id,
            name: e.name,
            date: e.date,
            ministerio_id: e.ministerio_id ?? null,
            ministerio_nome: (min as { name?: string } | null)?.name ?? null,
          };
        });
        setEventos(evts);
        setEventoSel(evts[0]?.id ?? "");
      });
  }, [aberto, groupId]);

  // Quando evento sem ministério é selecionado, carrega atribuições
  useEffect(() => {
    setAtribuicoes([]);
    setAtribuicaoSel("");
    if (!eventoSel) return;
    const evt = eventos.find((e) => e.id === eventoSel);
    if (!evt || evt.ministerio_id) return; // troca ministerial — não precisa de atribuição

    setCarregandoAtr(true);
    const supabase = createClient();
    supabase
      .from("assignments")
      .select("id, role:roles(id, name), account:accounts(id, user:users(name))")
      .eq("event_id", eventoSel)
      .then(({ data }) => {
        const asgns: Atribuicao[] = (data ?? []).map((a) => {
          const role = Array.isArray(a.role) ? a.role[0] : a.role;
          const acc = Array.isArray(a.account) ? a.account[0] : a.account;
          const u = acc ? (Array.isArray(acc.user) ? acc.user[0] : acc.user) : null;
          return {
            id: a.id,
            role_id: (role as { id?: string } | null)?.id ?? "",
            role_name: (role as { name?: string } | null)?.name ?? "Função",
            member_name: (u as { name?: string } | null)?.name ?? "Membro",
          };
        });
        setAtribuicoes(asgns);
        setAtribuicaoSel(asgns[0]?.id ?? "");
        setCarregandoAtr(false);
      });
  }, [eventoSel, eventos]);

  function fechar() {
    setAberto(false);
    setErro("");
    setMotivo("");
    setEventoSel("");
    setAtribuicoes([]);
    setAtribuicaoSel("");
  }

  async function solicitar() {
    if (!eventoSel || busy) return;
    const evt = eventos.find((e) => e.id === eventoSel);
    if (!evt) return;

    // Para troca de função, precisa de atribuição selecionada
    if (!evt.ministerio_id && !atribuicaoSel) return;

    setBusy(true);
    setErro("");

    const atr = atribuicoes.find((a) => a.id === atribuicaoSel);
    const body = evt.ministerio_id
      ? { eventId: eventoSel, ministerioId: evt.ministerio_id, reason: motivo.trim() || undefined }
      : { eventId: eventoSel, assignmentId: atribuicaoSel, roleId: atr?.role_id, reason: motivo.trim() || undefined };

    const res = await fetch("/api/swap-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErro(b.error ?? "Erro ao solicitar troca.");
      return;
    }
    fechar();
    router.refresh();
  }

  if (!groupId) return null;

  const eventoAtual = eventos.find((e) => e.id === eventoSel);
  const ehMinisterio = !!eventoAtual?.ministerio_id;
  const podeSolicitar = eventoSel && (ehMinisterio || atribuicaoSel);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-[12px] border border-black/10 px-4 py-2 text-[13px] font-semibold text-ink hover:bg-surface"
      >
        Solicitar troca
      </button>

      {aberto && (
        <>
          <div onClick={fechar} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-4 text-[12px] tracking-[0.4px] text-muted">SOLICITAR TROCA</div>

              <div className="flex flex-col gap-4">
                {/* Seleção de evento */}
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-muted">EVENTO</div>
                  {eventos.length === 0 ? (
                    <p className="text-[13px] text-muted">Carregando...</p>
                  ) : eventos.length === 0 ? (
                    <p className="text-[13px] text-muted">Nenhum evento futuro.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={eventoSel}
                        onChange={(e) => setEventoSel(e.target.value)}
                        className="w-full appearance-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 pr-8 text-[14px] text-ink outline-none"
                      >
                        {eventos.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} — {formatarData(e.date)}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">▾</span>
                    </div>
                  )}
                </div>

                {/* Contexto: ministério ou atribuição */}
                {eventoSel && eventoAtual && (
                  ehMinisterio ? (
                    <div className="rounded-[12px] bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
                      Troca de ministério:{" "}
                      <span className="font-semibold">{eventoAtual.ministerio_nome ?? "Ministério"}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1.5 text-[12px] font-semibold text-muted">ATRIBUIÇÃO A TROCAR</div>
                      {carregandoAtr ? (
                        <p className="text-[13px] text-muted">Carregando...</p>
                      ) : atribuicoes.length === 0 ? (
                        <p className="text-[13px] text-muted">Nenhuma atribuição neste evento.</p>
                      ) : (
                        <div className="relative">
                          <select
                            value={atribuicaoSel}
                            onChange={(e) => setAtribuicaoSel(e.target.value)}
                            className="w-full appearance-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 pr-8 text-[14px] text-ink outline-none"
                          >
                            {atribuicoes.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.member_name} · {a.role_name}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">▾</span>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Motivo */}
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-muted">MOTIVO (OPCIONAL)</div>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: membro não poderá comparecer"
                    rows={3}
                    className="w-full resize-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {erro && <p className="mt-2 text-[12.5px] text-danger">{erro}</p>}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={fechar}
                  className="flex-1 rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink"
                >
                  Cancelar
                </button>
                <button
                  onClick={solicitar}
                  disabled={!podeSolicitar || busy}
                  className="flex-1 rounded-[14px] bg-primary py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Enviando..." : "Solicitar troca"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
