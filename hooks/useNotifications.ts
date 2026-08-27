"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentAccount } from "./useCurrentAccount";
import { logAccess } from "@/lib/access-log";
import type { Notification } from "@/lib/types";

const LIMIT = 20;

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    title: row.title as string,
    body: row.body as string,
    type: row.type as Notification["type"],
    referenceType: (row.reference_type as Notification["referenceType"]) ?? null,
    referenceId: (row.reference_id as string) ?? null,
    read: row.read as boolean,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
    senderAccountId: (row.sender_account_id as string) ?? null,
  };
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useNotifications(providedAccountId?: string | null): UseNotificationsReturn {
  const { data: currentAccount } = useCurrentAccount();
  const accountId = providedAccountId ?? currentAccount?.account.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!accountId) {
      setIsLoading(false);
      return;
    }

    let cancelado = false;

    async function carregar() {
      setIsLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .range(0, LIMIT - 1);

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("read", false);

      if (cancelado) return;

      const notifs = (data ?? []).map(rowToNotification);
      setNotifications(notifs);
      setHasMore(notifs.length === LIMIT);
      setUnreadCount(count ?? 0);
      setIsLoading(false);
    }

    carregar();

    const supabase = createClient();
    // O cliente do browser é um singleton, então o mesmo topic de channel é
    // compartilhado entre TODAS as instâncias deste hook (o sino aparece em
    // mais de um ponto do shell, e o dropdown monta outra instância). Se dois
    // channels com o mesmo topic forem criados no mesmo cliente, o segundo
    // `.on()` roda depois do `.subscribe()` do primeiro e lança
    // "cannot add postgres_changes callbacks ... after subscribe()", um erro
    // não-tratado que derruba a árvore de render inteira. Um sufixo único por
    // inscrição garante que cada instância tenha seu próprio channel — também
    // evita colisão em remontagens rápidas, onde o removeChannel anterior
    // ainda não terminou.
    const channel = supabase
      .channel(`notifications-${accountId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const nova = rowToNotification(payload.new as Record<string, unknown>);
          setNotifications((prev) => [nova, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!accountId) return;
      const supabase = createClient();
      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ read: true, read_at: now })
        .eq("id", id);
      logAccess(accountId, "ler_notificacao", { notification_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: now } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [accountId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!accountId) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read: true, read_at: now })
      .eq("account_id", accountId)
      .eq("read", false);
    logAccess(accountId, "ler_notificacao", { all: true });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: now })));
    setUnreadCount(0);
  }, [accountId]);

  const loadMore = useCallback(async () => {
    if (!accountId || !hasMore) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(notifications.length, notifications.length + LIMIT - 1);

    const more = (data ?? []).map(rowToNotification);
    setNotifications((prev) => [...prev, ...more]);
    setHasMore(more.length === LIMIT);
  }, [accountId, notifications.length, hasMore]);

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, hasMore, loadMore };
}
