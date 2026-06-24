"use client";

import { createContext, useContext } from "react";

/** Chrome contextual da topbar web (título + voltar + ação). */
export type PageChrome = {
  title: string;
  showBack: boolean;
  actionLabel?: string;
  actionHref?: string;
};

type ShellContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  /** Iniciais do usuário logado, para o avatar do header. */
  userIniciais: string;
  /** Nome do usuário logado (para a saudação "Olá, ..."). */
  userNome: string;
  /** Chrome atual exibido na topbar web. */
  chrome: PageChrome;
  /** As páginas registram seu chrome (título/ação/voltar) aqui. */
  setChrome: (chrome: PageChrome) => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

/** Acesso à casca do app (menu lateral + dados do usuário) a partir dos headers. */
export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell deve ser usado dentro do AppShell");
  }
  return ctx;
}
