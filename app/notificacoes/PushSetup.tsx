"use client";

import { useEffect, useState } from "react";
import { syncSubscriptionToDB } from "@/lib/push";

/**
 * Faixa que verifica/ativa as notificações push do dispositivo. Aparece na tela
 * de notificações recebidas quando ainda não há assinatura ativa.
 */
export default function PushSetup({ accountId }: { accountId: string | null }) {
  type S = "checking" | "active" | "inactive" | "denied" | "unavailable" | "error";
  const [state, setState] = useState<S>("checking");
  const [step, setStep] = useState(""); // passo atual visível ao usuário
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecção de capacidade no mount
      setState("unavailable");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

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
          setState(ok ? "active" : "inactive");
        } else {
          setState("inactive");
        }
      })
      .catch(() => setState("inactive"));
  }, []);

  async function activate() {
    if (!accountId) {
      setErrorMsg("accountId ausente — recarregue a página.");
      setState("error");
      return;
    }

    setState("checking");
    setErrorMsg("");

    try {
      setStep("Registrando service worker...");
      await navigator.serviceWorker.register("/sw.js");

      setStep("Aguardando service worker ficar ativo...");
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service worker não ficou pronto em 8s. Recarregue o app.")), 8000)
        ),
      ]);

      setStep("Solicitando permissão de notificação...");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Permissão ${permission}. Ative nas configurações do dispositivo.`);
      }

      setStep("Criando assinatura push...");
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID key não configurada.");

      const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64);
      const keyBuffer = new ArrayBuffer(raw.length);
      const keyView = new Uint8Array(keyBuffer);
      for (let i = 0; i < raw.length; i++) keyView[i] = raw.charCodeAt(i);

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        });
      }

      setStep("Salvando no servidor...");
      const keys = subscription.toJSON().keys!;
      const res = await fetch("/api/push/sync", {
        method: "POST",
        credentials: "include",
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
        throw new Error(`Servidor: ${body.error ?? res.status}`);
      }

      setStep("");
      setState("active");
    } catch (err) {
      setStep("");
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (state === "active") return null;

  const label =
    state === "checking"
      ? step || "Verificando..."
      : state === "unavailable"
      ? "Notificações push não disponíveis neste navegador."
      : state === "denied"
      ? "Notificações bloqueadas — ative nas configurações do dispositivo."
      : state === "error"
      ? `Erro: ${errorMsg}`
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
            className="flex-none rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white"
          >
            Ativar
          </button>
        )}
      </div>
    </div>
  );
}
