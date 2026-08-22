"use client";

import { useState } from "react";
import { isIOSSafari, isRunningAsPWA } from "@/hooks/useInstallPrompt";

const STORAGE_KEY = "ef_ios_install_dismissed";

export function IOSInstallBanner() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    return !dismissed && isIOSSafari() && !isRunningAsPWA();
  });

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-paper rounded-2xl shadow-modal border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-paper text-sm font-bold">EF</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Instalar Escala Fácil</p>
          <p className="text-xs text-muted mt-1">
            Toque em{" "}
            <span className="inline-flex items-center gap-0.5 text-primary font-medium">
              <ShareIcon />
              Compartilhar
            </span>{" "}
            e depois em{" "}
            <span className="font-medium text-ink-soft">&ldquo;Adicionar à Tela de Início&rdquo;</span>.
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="mt-3 w-full bg-surface text-muted text-xs font-semibold py-2 rounded-lg"
      >
        Entendi
      </button>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
