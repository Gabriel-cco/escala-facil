"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ministerio = { id: string; name: string };
type Evento = { id: string; name: string; date: string };

const MESES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function formatarData(d: string) {
  const [, m, dia] = d.split("-").map(Number);
  return `${dia} ${MESES_CURTO[m - 1]}`;
}

export default function SolicitarTrocaMinisterioAdminButton({
  groupId,
}: {
  groupId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ministerioSel, setMinisterioSel] = useState("");
  const [eventoSel, setEventoSel] = useState("");
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!aberto || !groupId) return;
    const supabase = createClient();
    supabase
      .from("ministerios")
      .select("id, name")
      .eq("group_id", groupId)
      .order("name")
      .then(({ data }) => {
        setMinisterios(data ?? []);
        setMinisterioSel(data?.[0]?.id ?? "");
      });
  }, [aberto, groupId]);

  useEffect(() => {
    setEventos([]);
    setEventoSel("");
    if (!ministerioSel) return;
    const supabase = createClient();
    const hoje = new Date().toISOString().slice(0, 10);
    supabase
      .from("events")
      .select("id, name, date")
      .eq("ministerio_id", ministerioSel)
      .gte("date", hoje)
      .order("date")
      .then(({ data }) => {
        setEventos(data ?? []);
        setEventoSel(data?.[0]?.id ?? "");
      });
  }, [ministerioSel]);

  function fechar() {
    setAberto(false);
    setErro("");
    setMotivo("");
  }

  async function solicitar() {
    if (!ministerioSel || !eventoSel || busy) return;
    setBusy(true);
    setErro("");
    const res = await fetch("/api/swap-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: eventoSel,
        ministerioId: ministerioSel,
        reason: motivo.trim() || undefined,
      }),
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

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-[12px] border border-amber-400/50 px-4 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-50"
      >
        Solicitar troca de ministério
      </button>

      {aberto && (
        <>
          <div onClick={fechar} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-4 text-[12px] tracking-[0.4px] text-muted">SOLICITAR TROCA DE MINISTÉRIO</div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-muted">MINISTÉRIO</div>
                  {ministerios.length === 0 ? (
                    <p className="text-[13px] text-muted">Carregando...</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={ministerioSel}
                        onChange={(e) => setMinisterioSel(e.target.value)}
                        className="w-full appearance-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 pr-8 text-[14px] text-ink outline-none"
                      >
                        {ministerios.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">▾</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-muted">EVENTO</div>
                  {ministerioSel && eventos.length === 0 ? (
                    <p className="text-[13px] text-muted">Nenhum evento futuro para este ministério.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={eventoSel}
                        onChange={(e) => setEventoSel(e.target.value)}
                        disabled={eventos.length === 0}
                        className="w-full appearance-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 pr-8 text-[14px] text-ink outline-none disabled:opacity-50"
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

                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-muted">MOTIVO (OPCIONAL)</div>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ex.: ministério não poderá comparecer"
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
                  disabled={!eventoSel || busy}
                  className="flex-1 rounded-[14px] bg-amber-600 py-3.5 text-[14px] font-semibold text-white disabled:opacity-50"
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
