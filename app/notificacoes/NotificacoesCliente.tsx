"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { registerPushSubscription, syncSubscriptionToDB } from "@/lib/push";
import { isIOSSafari, isRunningAsPWA } from "@/hooks/useInstallPrompt";
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

function PushStatusBanner({
  status,
  activating,
  onActivate,
}: {
  status: PushStatus;
  activating: boolean;
  onActivate: () => void;
}) {
  const msgs: Record<PushStatus, string> = {
    active: "",
    default: "Ative as notificações para ser avisado sobre sua escala.",
    granted: "Permissão concedida — clique para finalizar o registro.",
    denied: "Notificações bloqueadas. Ative nas configurações do dispositivo.",
    ios_safari:
      "Abra o app pelo ícone na tela inicial (não pelo Safari) para receber notificações.",
    ios_outdated:
      "Atualize para iOS 16.4 ou superior para receber notificações push.",
    unsupported: "Seu navegador não suporta notificações push.",
  };

  const canActivate = status === "default" || status === "granted";

  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="mt-0.5 text-base">🔔</span>
      <p className="flex-1 text-[13px] leading-snug text-amber-800">{msgs[status]}</p>
      {canActivate && (
        <button
          onClick={onActivate}
          disabled={activating}
          className="flex-none rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
        >
          {activating ? "..." : "Ativar"}
        </button>
      )}
    </div>
  );
}

interface Props {
  accountId: string | null;
  perfil: Profile | null;
}

type PushStatus =
  | "active"         // subscription registrada e salva
  | "default"        // API disponível, permissão não pedida ainda
  | "granted"        // permissão dada mas sem subscription local
  | "denied"         // usuário bloqueou
  | "ios_safari"     // iOS mas aberto no Safari (não como PWA)
  | "ios_outdated"   // iOS < 16.4 (sem suporte a Web Push)
  | "unsupported";   // navegador não suporta (não iOS)

function usePushStatus(accountId: string | null) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    // iOS Safari browser (não PWA) — Notification não existe aqui
    if (isIOSSafari() && !isRunningAsPWA()) {
      setStatus("ios_safari");
      return;
    }

    // API indisponível
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS PWA mas versão antiga (< 16.4)
      setStatus(isIOSSafari() ? "ios_outdated" : "unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then(async (sub) => {
        if (sub) {
          // Subscription existe localmente — sincroniza com o banco em background.
          // Cobre o caso onde o subscribe() funcionou mas o upsert falhou antes.
          syncSubscriptionToDB().then((ok) => {
            if (!ok) console.warn("[Push] Sync com DB falhou — subscription local existe mas nao foi salva");
          });
          setStatus("active");
        } else {
          setStatus(Notification.permission === "granted" ? "granted" : "default");
        }
      });
    });
  }, []);

  async function activate() {
    if (!accountId) return;
    setActivating(true);
    const ok = await registerPushSubscription(accountId);
    setActivating(false);
    if (ok) setStatus("active");
  }

  return { status, activating, activate };
}

export default function NotificacoesCliente({ accountId, perfil }: Props) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, hasMore, loadMore } =
    useNotifications(accountId);

  const isAdminOrCoord = perfil === "admin" || perfil === "coordinator";

  const { status: pushStatus, activating: pushActivating, activate: activatePush } =
    usePushStatus(accountId);

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
      {/* ===== Status push ===== */}
      {pushStatus !== null && pushStatus !== "active" && (
        <PushStatusBanner status={pushStatus} activating={pushActivating} onActivate={activatePush} />
      )}

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
