"use client";

// Chrome/Android exige ArrayBuffer — string base64url falha silenciosamente
function vapidKeyToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

// Lança erro com mensagem legível em vez de retornar false silenciosamente
export async function registerPushSubscription(accountId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push não suportado neste navegador.");
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error("VAPID key não configurada. Contacte o suporte.");
  }

  // Registra o SW e aguarda estar ativo
  await navigator.serviceWorker.register("/sw.js");
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Service worker demorou demais. Tente recarregar o app.")), 8000)
    ),
  ]);

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(`Permissão negada (${permission}). Ative nas configurações do dispositivo.`);
  }

  // Reutiliza subscription existente ou cria uma nova
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToBuffer(vapidKey),
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
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`Falhou ao salvar no servidor: ${body.error ?? res.status}`);
  }

  return true;
}

// Sincroniza subscription local com o banco via API route sem pedir permissão
export async function syncSubscriptionToDB(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 4000)
      ),
    ]);

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

    return res.ok;
  } catch {
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
