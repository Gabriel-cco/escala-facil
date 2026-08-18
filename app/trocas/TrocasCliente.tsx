"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SwapItem = {
  id: string;
  assignmentId: string;
  eventId: string;
  roleId: string;
  requesterAccountId: string;
  accepterAccountId: string | null;
  status: "pending" | "accepted" | "cancelled";
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  eventName: string;
  eventDate: string;
  dataLabel: string;
  roleName: string;
  requesterName: string;
  accepterName: string | null;
  isOwn: boolean;
  canAccept: boolean;
};

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  return `${dias}d`;
}

function SwapCard({
  swap,
  onAccept,
  onCancel,
  busy,
}: {
  swap: SwapItem;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  busy: string | null; // id do swap em operação
}) {
  const isBusy = busy === swap.id;

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">{swap.eventName}</span>
            <span className="text-[12px] text-muted">·</span>
            <span className="text-[13px] text-muted">{swap.dataLabel}</span>
          </div>
          <div className="mt-0.5 text-[13px] text-muted">{swap.roleName}</div>
        </div>
        <span className="flex-none text-[11.5px] text-faint">{tempoRelativo(swap.createdAt)}</span>
      </div>

      <div className="text-[13px] text-ink-soft">
        {swap.isOwn ? (
          <span>Você solicitou esta troca</span>
        ) : (
          <span>
            <span className="font-medium text-ink">{swap.requesterName}</span> precisa de alguém
          </span>
        )}
      </div>

      {swap.reason && (
        <div className="rounded-[10px] bg-surface px-3 py-2 text-[12.5px] italic text-muted">
          "{swap.reason}"
        </div>
      )}

      {swap.status === "pending" && (
        <div className="flex gap-2">
          {swap.canAccept && (
            <button
              onClick={() => onAccept(swap.id)}
              disabled={isBusy}
              className="flex-1 rounded-[10px] bg-primary py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {isBusy ? "Aceitando..." : "Aceitar"}
            </button>
          )}
          {swap.isOwn && (
            <button
              onClick={() => onCancel(swap.id)}
              disabled={isBusy}
              className="rounded-[10px] border border-danger/30 px-4 py-2 text-[13px] font-semibold text-danger disabled:opacity-50"
            >
              {isBusy ? "..." : "Cancelar"}
            </button>
          )}
          {!swap.canAccept && !swap.isOwn && (
            <span className="text-[12.5px] text-faint italic">
              Você já está escalado neste evento
            </span>
          )}
        </div>
      )}

      {swap.status === "accepted" && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-[12.5px] text-muted">
            Aceita por{" "}
            <span className="font-medium text-ink">{swap.accepterName ?? "alguém"}</span>
            {" · "}
            <Link href={`/eventos/${swap.eventId}`} className="text-primary hover:underline">
              Ver evento
            </Link>
          </span>
        </div>
      )}

      {swap.status === "cancelled" && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-faint" />
          <span className="text-[12.5px] text-muted">Cancelada</span>
        </div>
      )}
    </div>
  );
}

export default function TrocasCliente({
  accountId,
  profile,
  pending: initialPending,
  resolved: initialResolved,
}: {
  accountId: string;
  profile: "admin" | "coordinator" | "member";
  pending: SwapItem[];
  resolved: SwapItem[];
}) {
  const [filtro, setFiltro] = useState<"pendentes" | "resolvidas">("pendentes");
  const [pending, setPending] = useState<SwapItem[]>(initialPending);
  const [resolved, setResolved] = useState<SwapItem[]>(initialResolved);
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const router = useRouter();

  // Realtime: atualiza lista ao vivo quando outro membro aceita/cancela
  useEffect(() => {
    const supabase = createClient();
    // Topic único por inscrição: evita o erro "cannot add postgres_changes
    // callbacks ... after subscribe()" se o channel colidir com um anterior
    // ainda não removido (removeChannel é assíncrono) numa remontagem rápida.
    const channel = supabase
      .channel(`swap-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swap_requests" },
        () => { router.refresh(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const accept = useCallback(async (id: string) => {
    setBusy(id);
    setErro("");
    const res = await fetch(`/api/swap-requests/${id}/accept`, {
      method: "POST",
      credentials: "include",
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErro(b.error ?? "Erro ao aceitar.");
      router.refresh();
      return;
    }
    router.refresh();
  }, [router]);

  const cancel = useCallback(async (id: string) => {
    setBusy(id);
    setErro("");
    const res = await fetch(`/api/swap-requests/${id}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErro(b.error ?? "Erro ao cancelar.");
    }
    router.refresh();
  }, [router]);

  // Quando o servidor re-renderiza (router.refresh), as props são re-passadas
  // mas o estado local não é resetado — sincroniza manualmente
  useEffect(() => { setPending(initialPending); }, [initialPending]);
  useEffect(() => { setResolved(initialResolved); }, [initialResolved]);

  const lista = filtro === "pendentes" ? pending : resolved;

  return (
    <main className="flex flex-1 flex-col gap-5 px-[18px] pb-10 pt-3 md:p-0">
      {/* CTA para membros solicitarem troca via Minha Escala (mobile) */}
      {profile === "member" && (
        <Link
          href="/minha-escala"
          className="flex items-center justify-between rounded-[14px] border border-primary/30 bg-primary/5 px-4 py-3 md:hidden"
        >
          <span className="text-[13.5px] font-semibold text-primary">Solicitar troca</span>
          <span className="text-[18px] text-primary">›</span>
        </Link>
      )}

      {/* Filtro */}
      <div className="flex gap-2">
        {(["pendentes", "resolvidas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              filtro === f
                ? "bg-primary text-white"
                : "bg-surface text-muted hover:bg-border"
            }`}
          >
            {f === "pendentes" ? `Pendentes${pending.length > 0 ? ` (${pending.length})` : ""}` : "Histórico"}
          </button>
        ))}
      </div>

      {erro && (
        <div className="rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">
          {erro}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">
            {filtro === "pendentes" ? "Nenhuma troca pendente" : "Nenhuma troca resolvida"}
          </p>
          <p className="text-[13px] text-muted">
            {filtro === "pendentes"
              ? profile === "member"
                ? "Para solicitar uma troca, vá em Minha Escala e toque em 'Solicitar troca' no evento desejado."
                : "Quando alguém solicitar uma troca, vai aparecer aqui."
              : "O histórico de trocas vai aparecer aqui."}
          </p>
          {filtro === "pendentes" && profile === "member" && (
            <Link
              href="/minha-escala"
              className="mt-2 rounded-[12px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Ir para Minha Escala
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((s) => (
            <SwapCard
              key={s.id}
              swap={s}
              onAccept={accept}
              onCancel={cancel}
              busy={busy}
            />
          ))}
        </div>
      )}
    </main>
  );
}
