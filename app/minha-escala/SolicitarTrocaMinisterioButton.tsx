"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SolicitarTrocaMinisterioButton({
  eventId,
  ministerioId,
  ministerioNome,
  dataLabel,
  jaPendente,
}: {
  eventId: string;
  ministerioId: string;
  ministerioNome: string;
  dataLabel: string;
  jaPendente: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  if (jaPendente) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-semibold text-amber-700">
        Troca de ministério solicitada · aguardando
      </span>
    );
  }

  async function solicitar() {
    if (busy) return;
    setBusy(true);
    setErro("");
    const res = await fetch("/api/swap-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ministerioId, reason: motivo.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErro(b.error ?? "Erro ao solicitar troca.");
      return;
    }
    setAberto(false);
    setMotivo("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => { setAberto(true); setMotivo(""); setErro(""); }}
        className="rounded-lg border border-amber-400/50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 hover:bg-amber-50"
      >
        Solicitar troca de ministério
      </button>

      {aberto && (
        <>
          <div onClick={() => setAberto(false)} className="ef-backdrop fixed inset-0 z-40 bg-black/30" />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">SOLICITAR TROCA DE MINISTÉRIO</div>
              <div className="mb-1 text-[19px] font-semibold text-ink">{ministerioNome}</div>
              <div className="mb-4 text-[13px] text-muted">{dataLabel}</div>
              <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">
                Motivo (opcional)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: nosso ministério não poderá comparecer"
                rows={3}
                className="mb-1 w-full resize-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {erro && <p className="mb-2 text-[12.5px] text-danger">{erro}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setAberto(false)}
                  className="flex-1 rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink"
                >
                  Cancelar
                </button>
                <button
                  onClick={solicitar}
                  disabled={busy}
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
