"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteEventoButton({
  eventId,
  titulo,
  className = "",
}: {
  eventId: string;
  titulo: string;
  className?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function apagar() {
    if (apagando) return;
    setErro("");
    setApagando(true);
    const supabase = createClient();
    // As atribuições do evento somem em cascata (assignments_event_id_fkey).
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      setApagando(false);
      setErro("Erro ao apagar: " + error.message);
      return;
    }
    setApagando(false);
    setConfirmando(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Remover evento"
        onClick={() => setConfirmando(true)}
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-faint transition-colors hover:bg-black/[0.04] hover:text-danger ${className}`}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
          <path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>

      {confirmando && (
        <>
          <div
            onClick={() => !apagando && setConfirmando(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">
                REMOVER
              </div>
              <div className="mb-2 font-serif text-[19px] font-semibold text-ink">
                Apagar evento?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#5d5d5a]">
                &ldquo;{titulo}&rdquo; e todas as suas atribuições serão
                removidos. Esta ação não pode ser desfeita.
              </p>

              {erro && <p className="mb-3 text-[13px] text-danger">{erro}</p>}

              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={apagando}
                  className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={apagar}
                  disabled={apagando}
                  className="rounded-[14px] bg-danger py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {apagando ? "Apagando..." : "Apagar evento"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
