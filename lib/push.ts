"use client";

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
    const res = await fetch("/api/push/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Push] Erro ao salvar subscription:", err);
      return false;
    }

    console.log("[Push] Subscription registrada com sucesso");
    return true;
  } catch (err) {
    console.error("[Push] Erro ao registrar push subscription:", err);
    return false;
  }
}

// Salva uma subscription já existente no browser para o banco via API route (server client).
// Usa a rota /api/push/sync para evitar problemas de sessão com o browser client em iOS PWA.
export async function syncSubscriptionToDB(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    const keys = subscription.toJSON().keys!;
    const res = await fetch("/api/push/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Push] Erro ao sincronizar subscription:", err);
      return false;
    }

    console.log("[Push] Subscription local sincronizada com DB");
    return true;
  } catch (err) {
    console.error("[Push] Erro ao sincronizar:", err);
    return false;
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/api/push/sync", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
