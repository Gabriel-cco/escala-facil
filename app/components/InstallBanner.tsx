"use client";

import { useState, useEffect } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const STORAGE_KEY = "ef_install_dismissed";

export function InstallBanner() {
  const { isInstallable, isPWA, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true); // começa escondido para evitar flash

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  if (isPWA || !isInstallable || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
        <span className="text-white text-sm font-bold">EF</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">Instalar Escala Fácil</p>
        <p className="text-xs text-neutral-500 mt-0.5">Acesse rápido pela tela inicial</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={promptInstall}
            className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-lg"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            className="flex-1 bg-neutral-100 text-neutral-600 text-xs font-semibold py-1.5 rounded-lg"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
