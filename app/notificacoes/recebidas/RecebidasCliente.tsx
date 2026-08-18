"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import PushSetup from "../PushSetup";
import type { Notification } from "@/lib/types";

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
    if (notification.referenceType === "swap_request") {
      router.push("/trocas");
    } else if (notification.referenceType === "event" && notification.referenceId) {
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
        <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-muted">
          {notification.body}
        </p>
        <p className="mt-2 text-[11.5px] text-faint">{tempoRelativo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

/** Feed de notificações recebidas — alcançado pelo sino. */
export default function RecebidasCliente({ accountId }: { accountId: string | null }) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, hasMore, loadMore } =
    useNotifications(accountId);
  const [aba, setAba] = useState<"nao_lidas" | "lidas">("nao_lidas");

  const lista = notifications.filter((n) => (aba === "nao_lidas" ? !n.read : n.read));

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pb-10 pt-2 md:gap-5 md:p-0">
      <PushSetup accountId={accountId} />

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(
            [
              ["nao_lidas", unreadCount > 0 ? `Não lidas (${unreadCount})` : "Não lidas"],
              ["lidas", "Já lidas"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setAba(valor)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                aba === valor
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
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
      ) : lista.length === 0 ? (
        <div className="rounded-[14px] bg-paper px-6 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.07)]">
          <p className="text-[13.5px] text-muted">
            {aba === "nao_lidas" ? "Nenhuma notificação não lida" : "Nenhuma notificação lida"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lista.map((n) => (
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
    </main>
  );
}
