"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const STORAGE_KEY = "ef_install_dismissed";

export function InstallBanner() {
  const { isInstallable, isPWA, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  if (isPWA || !isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 bg-paper rounded-2xl shadow-modal border border-border p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
        <span className="text-paper text-sm font-bold">EF</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">Instalar Escala Fácil</p>
        <p className="text-xs text-muted mt-0.5">Acesse rápido pela tela inicial</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={promptInstall}
            className="flex-1 bg-primary text-paper text-xs font-semibold py-1.5 rounded-lg"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            className="flex-1 bg-surface text-muted text-xs font-semibold py-1.5 rounded-lg"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
