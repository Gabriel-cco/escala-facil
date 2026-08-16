"use client";

import { createClient } from "@/lib/supabase/client";

export async function registerPushSubscription(accountId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push não suportado neste navegador");
    return false;
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("VAPID public key não configurada");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    const keys = subscription.toJSON().keys!;
    const supabase = createClient();
    await supabase.from("push_subscriptions").upsert(
      {
        account_id: accountId,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );

    return true;
  } catch (err) {
    console.error("Erro ao registrar push subscription:", err);
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
