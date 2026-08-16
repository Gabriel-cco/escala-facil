"use client";

import { createClient } from "@/lib/supabase/client";

export async function registerPushSubscription(accountId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push] Não suportado neste navegador");
    return false;
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[Push] VAPID public key não configurada");
    return false;
  }

  try {
    // Registra o SW (idempotente — não faz nada se já estiver registrado)
    await navigator.serviceWorker.register("/sw.js");
    // Aguarda o SW estar ativo e controlando a página antes de assinar
    // (usar o resultado de register() é race condition na primeira carga)
    const registration = await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[Push] Permissão negada:", permission);
      return false;
    }

    // Reutiliza assinatura existente se houver (evita criar duplicatas)
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    }

    const keys = subscription.toJSON().keys!;
    const supabase = createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        account_id: accountId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("[Push] Erro ao salvar subscription:", error);
      return false;
    }

    console.log("[Push] Subscription registrada com sucesso");
    return true;
  } catch (err) {
    console.error("[Push] Erro ao registrar push subscription:", err);
    return false;
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const supabase = createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
