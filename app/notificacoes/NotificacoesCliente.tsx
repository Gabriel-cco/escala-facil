"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { registerPushSubscription, syncSubscriptionToDB } from "@/lib/push";
import type { Notification, Profile } from "@/lib/types";

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

interface EnviadaGrupo {
  title: string;
  body: string;
  createdAt: string;
  count: number;
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => Promise<void>;
}) {
  const router = useRouter();

  async function handleClick() {
    if (!notification.read) await onMarkRead(notification.id);
    if (notification.referenceType === "event" && notification.referenceId) {
      router.push(`/eventos/${notification.referenceId}`);
    } else if (notification.referenceType === "group" && notification.referenceId) {
      router.push(`/grupos/${notification.referenceId}`);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3.5 rounded-[14px] bg-paper p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.07)] transition-colors active:bg-surface"
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${
          notification.read ? "bg-transparent" : "bg-primary"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-[14px] leading-snug ${
            notification.read ? "font-normal text-ink" : "font-semibold text-ink"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-muted">{notification.body}</p>
        <p className="mt-2 text-[11.5px] text-faint">{tempoRelativo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

// Painel de configuração de push — sempre visível, sem depender de detecção de UA.
// Mostra o estado atual e erro na tela (útil para debug remoto).
function PushSetup({ accountId }: { accountId: string | null }) {
  type S = "checking" | "active" | "inactive" | "denied" | "unavailable" | "error";
  const [state, setState] = useState<S>("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unavailable");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Timeout de 4 s no serviceWorker.ready — no iOS 26 pode travar indefinidamente
    const swReady = Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW_TIMEOUT")), 4000)
      ),
    ]);

    swReady
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (sub) {
          const ok = await syncSubscriptionToDB();
          setState(ok ? "active" : "error");
          if (!ok) setErrorMsg("Subscription encontrada mas falhou ao salvar. Tente ativar novamente.");
        } else {
          setState("inactive");
        }
      })
      .catch((err: Error) => {
        if (err.message === "SW_TIMEOUT") {
          // SW não ficou pronto — mostra botão de ativar direto
          setState("inactive");
        } else {
          setState("error");
          setErrorMsg(String(err));
        }
      });
  }, []);

  async function activate() {
    if (!accountId) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const ok = await registerPushSubscription(accountId);
      setState(ok ? "active" : "error");
      if (!ok) setErrorMsg("Falhou ao registrar. Verifique a permissão nas configurações.");
    } catch (err) {
      setState("error");
      setErrorMsg(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (state === "active") return null;

  const label =
    state === "checking"
      ? "Verificando notificações..."
      : state === "unavailable"
      ? "Notificações push não disponíveis neste navegador."
      : state === "denied"
      ? "Notificações bloqueadas — ative nas configurações do dispositivo."
      : state === "error"
      ? `Erro: ${errorMsg || "desconhecido"}`
      : "Ative as notificações para ser avisado sobre sua escala.";

  const canActivate = state === "inactive" || state === "error";

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-base">🔔</span>
        <p className="flex-1 text-[13px] leading-snug text-amber-800">{label}</p>
        {canActivate && (
          <button
            onClick={activate}
            disabled={busy}
            className="flex-none rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "..." : "Ativar"}
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  accountId: string | null;
  perfil: Profile | null;
}

export default function NotificacoesCliente({ accountId, perfil }: Props) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, hasMore, loadMore } =
    useNotifications(accountId);

  const isAdminOrCoord = perfil === "admin" || perfil === "coordinator";

  const [enviadas, setEnviadas] = useState<EnviadaGrupo[]>([]);
  const [loadingEnviadas, setLoadingEnviadas] = useState(false);

  useEffect(() => {
    if (!isAdminOrCoord || !accountId) return;

    async function carregarEnviadas() {
      setLoadingEnviadas(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("title, body, created_at")
        .eq("sender_account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) {
        setLoadingEnviadas(false);
        return;
      }

      const grupos = new Map<string, EnviadaGrupo>();
      for (const row of data) {
        const key = `${row.title}|${new Date(row.created_at).toISOString().slice(0, 19)}`;
        if (grupos.has(key)) {
          grupos.get(key)!.count++;
        } else {
          grupos.set(key, { title: row.title, body: row.body, createdAt: row.created_at, count: 1 });
        }
      }
      setEnviadas(Array.from(grupos.values()));
      setLoadingEnviadas(false);
    }

    carregarEnviadas();
  }, [isAdminOrCoord, accountId]);

  return (
    <main className="flex flex-1 flex-col gap-6 px-[18px] pb-10 pt-2 md:gap-8 md:p-0">
      {/* ===== Push setup ===== */}
      <PushSetup accountId={accountId} />

      {/* ===== Recebidas ===== */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">
            Recebidas
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[12.5px] font-medium text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-muted">Carregando...</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-[14px] bg-paper px-6 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
            <p className="text-[13.5px] text-muted">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} onMarkRead={markAsRead} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                className="mt-1 py-2 text-center text-[13px] font-medium text-primary hover:underline"
              >
                Ver mais
              </button>
            )}
          </div>
        )}
      </section>

      {/* ===== Histórico de enviadas (admin/coordinator) ===== */}
      {isAdminOrCoord && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Enviadas</h2>
            <Link
              href="/notificacoes/enviar"
              className="rounded-lg bg-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              + Enviar
            </Link>
          </div>

          {loadingEnviadas ? (
            <p className="py-4 text-center text-[13px] text-muted">Carregando...</p>
          ) : enviadas.length === 0 ? (
            <div className="rounded-[14px] bg-paper px-6 py-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
              <p className="text-[13.5px] text-muted">Nenhuma notificação enviada</p>
              <Link
                href="/notificacoes/enviar"
                className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
              >
                Enviar primeira notificação
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {enviadas.map((e, i) => (
                <div
                  key={i}
                  className="rounded-[14px] bg-paper p-4 shadow-[0_1px_3px_rgba(0,0,0,0.07)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold text-ink">{e.title}</p>
                    <span className="flex-none text-[11.5px] text-faint">
                      {tempoRelativo(e.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{e.body}</p>
                  <p className="mt-2 text-[11.5px] text-faint">
                    {e.count} destinatário{e.count !== 1 ? "s" : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
