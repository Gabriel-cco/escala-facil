"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
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

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-[3px] text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onClose,
}: {
  notification: Notification;
  onMarkRead: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const router = useRouter();

  async function handleClick() {
    if (!notification.read) await onMarkRead(notification.id);
    onClose();
    if (notification.referenceType === "event" && notification.referenceId) {
      router.push(`/eventos/${notification.referenceId}`);
    } else if (notification.referenceType === "group" && notification.referenceId) {
      router.push(`/grupos/${notification.referenceId}`);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
    >
      <span
        className={`mt-1.5 h-2 w-2 flex-none rounded-full transition-colors ${
          notification.read ? "bg-transparent" : "bg-primary"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] ${
            notification.read ? "font-normal text-ink" : "font-semibold text-ink"
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{notification.body}</p>
        <p className="mt-1 text-[11px] text-faint">{tempoRelativo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

function DropdownPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, hasMore, loadMore } =
    useNotifications();

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-[16px] border border-border bg-paper shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13.5px] font-semibold text-ink">Notificações</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted">Carregando...</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">Nenhuma notificação</p>
        ) : (
          <>
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} onClose={onClose} />
            ))}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 text-center text-[12px] font-medium text-primary hover:underline"
              >
                Ver mais
              </button>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-2.5">
        <Link
          href="/notificacoes"
          onClick={onClose}
          className="block text-center text-[12px] font-medium text-primary hover:underline"
        >
          Ver todas as notificações
        </Link>
      </div>
    </div>
  );
}

/** Sino de notificações: Link no mobile, dropdown no desktop. */
export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [aberto]);

  return (
    <>
      {/* Mobile: link direto para a página */}
      <Link
        href="/notificacoes"
        aria-label="Notificações"
        className="relative flex h-[38px] w-[38px] items-center justify-center text-ink md:hidden"
      >
        <BellIcon />
        {unreadCount > 0 && <Badge count={unreadCount} />}
      </Link>

      {/* Desktop: dropdown */}
      <div ref={ref} className="relative hidden md:block">
        <button
          onClick={() => setAberto((v) => !v)}
          aria-label="Notificações"
          className={`relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors ${
            aberto ? "bg-surface text-ink" : "text-ink-soft hover:bg-surface hover:text-ink"
          }`}
        >
          <BellIcon />
          {unreadCount > 0 && <Badge count={unreadCount} />}
        </button>

        {aberto && <DropdownPanel onClose={() => setAberto(false)} />}
      </div>
    </>
  );
}
