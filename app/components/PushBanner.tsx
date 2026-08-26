"use client";

import { useEffect, useState } from "react";
import { registerPushSubscription } from "@/lib/push";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";
import { isIOSSafari, isRunningAsPWA } from "@/hooks/useInstallPrompt";

const LS_KEY = "ef_push_dismissed";

export default function PushBanner() {
  const { data: currentAccount } = useCurrentAccount();
  const [descartado, setDescartado] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(LS_KEY);
  });
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState(false);
  const [precisaInstalar, setPrecisaInstalar] = useState(false);

  const temSupporte =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;
  const permissao = temSupporte ? Notification.permission : "denied";

  const visivel =
    !descartado &&
    !!currentAccount &&
    temSupporte &&
    permissao === "default";

  // Auto-register silently when permission already granted but no subscription
  useEffect(() => {
    if (!currentAccount || !temSupporte || permissao !== "granted") return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) {
          registerPushSubscription(currentAccount.account.id).then((ok) => {
            if (ok) localStorage.setItem(LS_KEY, "accepted");
          });
        }
      });
    });
  }, [currentAccount, temSupporte, permissao]);

  async function ativar() {
    if (!currentAccount) return;

    // iOS Safari sem PWA instalado não suporta Web Push — orientar instalação
    if (isIOSSafari() && !isRunningAsPWA()) {
      setPrecisaInstalar(true);
      return;
    }

    setAtivando(true);
    setErro(false);
    try {
      const ok = await registerPushSubscription(currentAccount.account.id);
      if (ok) {
        localStorage.setItem(LS_KEY, "accepted");
        setDescartado(true);
      } else {
        setErro(true);
      }
    } catch {
      setErro(true);
    } finally {
      setAtivando(false);
    }
  }

  function dispensar() {
    localStorage.setItem(LS_KEY, "dismissed");
    setDescartado(true);
  }

  if (!visivel) return null;

  return (
    <div className="fixed bottom-[80px] left-0 right-0 z-40 flex justify-center px-4 md:bottom-6">
      <div className="flex w-full max-w-[440px] flex-col gap-1.5 rounded-[16px] bg-ink px-4 py-3.5 shadow-lg md:max-w-[400px]">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13px] text-white">
            {precisaInstalar
              ? "Para ativar no iPhone, adicione o app à Tela de Início primeiro."
              : erro
              ? "Não foi possível ativar. Tente novamente."
              : "Quer receber avisos sobre sua escala?"}
          </p>
          <button
            onClick={dispensar}
            className="flex-none text-[12.5px] font-medium text-white/60 hover:text-white"
          >
            {precisaInstalar ? "Entendi" : "Agora não"}
          </button>
          {!precisaInstalar && (
            <button
              onClick={ativar}
              disabled={ativando}
              className="flex-none rounded-[10px] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-50"
            >
              {ativando ? "..." : "Ativar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
