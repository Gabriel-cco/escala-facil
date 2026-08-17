self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Intencionalmente SEM handler de `fetch`. Este SW existe apenas para push
// notifications — não há cache/offline. Um handler que faz
// `respondWith(fetch(event.request))` é idêntico ao comportamento nativo do
// browser, mas roteia todo o tráfego pela thread do SW e pode quebrar fluxos
// OAuth (redirects para o Google) se um fetch rejeitar. Sem handler, o browser
// trata cada requisição nativamente e o SW nunca interfere na navegação.

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || "",
    icon: "/pwa-icons/192",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Escala Fácil", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
