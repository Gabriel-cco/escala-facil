"use client";

import { useEffect, useState } from "react";
import { registerPushSubscription } from "@/lib/push";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";

const LS_KEY = "ef_push_dismissed";

export default function PushBanner() {
  const { data: currentAccount } = useCurrentAccount();
  const [visivel, setVisivel] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!currentAccount) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // Permissão já concedida — verifica se há assinatura local ativa.
      // Se não houver (ex: registro falhou antes, app reinstalado), re-registra silenciosamente.
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (!sub) {
            registerPushSubscription(currentAccount.account.id).then((ok) => {
              if (ok) localStorage.setItem(LS_KEY, "accepted");
            });
          }
        });
      });
      return;
    }

    // permission === "default"
    if (localStorage.getItem(LS_KEY)) return;
    setVisivel(true);
  }, [currentAccount]);

  async function ativar() {
    if (!currentAccount) return;
    setAtivando(true);
    setErro(false);
    const ok = await registerPushSubscription(currentAccount.account.id);
    setAtivando(false);
    if (ok) {
      localStorage.setItem(LS_KEY, "accepted");
      setVisivel(false);
    } else {
      // Mantém o banner visível mas mostra o erro para o usuário tentar de novo
      setErro(true);
    }
  }

  function dispensar() {
    localStorage.setItem(LS_KEY, "dismissed");
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed bottom-[80px] left-0 right-0 z-40 flex justify-center px-4 md:bottom-6">
      <div className="flex w-full max-w-[440px] flex-col gap-1.5 rounded-[16px] bg-ink px-4 py-3.5 shadow-lg md:max-w-[400px]">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13px] text-white">
            {erro ? "Não foi possível ativar. Tente novamente." : "Quer receber avisos sobre sua escala?"}
          </p>
          <button
            onClick={dispensar}
            className="flex-none text-[12.5px] font-medium text-white/60 hover:text-white"
          >
            Agora não
          </button>
          <button
            onClick={ativar}
            disabled={ativando}
            className="flex-none rounded-[10px] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-50"
          >
            {ativando ? "..." : "Ativar"}
          </button>
        </div>
      </div>
    </div>
  );
}
