"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { ShellContext, type PageChrome } from "./menu-context";
import { GroupProvider } from "@/contexts/GroupContext";
import TabBar from "./TabBar";
import SideMenu from "./SideMenu";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export type ShellUser = {
  nome: string;
  email: string;
  iniciais: string;
  perfil: "admin" | "coordinator" | "member" | null;
};

export const ROTULO_PERFIL: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordenador",
  member: "Membro",
};

const CHROME_INICIAL: PageChrome = { title: "", showBack: false };

/**
 * Casca responsiva (handoff: mesmo dado, duas apresentações):
 * - Mobile (<md): coluna central, header por página + barra de abas inferior
 *   + menu lateral em bottom-sheet.
 * - Web (>=md): sidebar fixa (248px) + topbar (72px) com ação contextual +
 *   conteúdo centralizado (max 980px). Modais centralizados no lugar dos sheets.
 * O /login é full-bleed (a própria página se centraliza).
 */
export default function AppShell({
  user,
  children,
}: {
  user: ShellUser | null;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [chrome, setChrome] = useState<PageChrome>(CHROME_INICIAL);
  const pathname = usePathname();

  const openMenu = useCallback(() => setMenuAberto(true), []);
  const closeMenu = useCallback(() => setMenuAberto(false), []);

  // Rotas full-bleed (sem a casca do app): a própria página se centraliza.
  const ehBare =
    pathname === "/login" ||
    pathname === "/acesso-pendente" ||
    pathname === "/selecionar-grupo" ||
    pathname.startsWith("/escala/");

  const contextValue = {
    openMenu,
    closeMenu,
    userIniciais: user?.iniciais ?? "",
    userNome: user?.nome ?? "",
    chrome,
    setChrome,
  };

  // Login / acesso pendente: sem chrome do app, ocupa a tela inteira.
  if (ehBare) {
    return (
      <ShellContext.Provider value={contextValue}>
        <div className="min-h-dvh bg-screen md:bg-app">{children}</div>
      </ShellContext.Provider>
    );
  }

  return (
    <ShellContext.Provider value={contextValue}>
      <GroupProvider>
        <div className="min-h-dvh bg-screen md:flex md:h-dvh md:min-h-0 md:overflow-hidden md:bg-app">
          {user && <Sidebar className="hidden md:flex" user={user} />}

          <div className="flex min-w-0 flex-col md:h-dvh md:flex-1">
            {user && <Topbar className="hidden md:flex" />}

            <div className="ef-scroll flex min-h-dvh flex-col md:min-h-0 md:flex-1 md:overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col md:max-w-[980px] md:px-10 md:py-8">
                {children}
              </div>
              <TabBar perfil={user?.perfil ?? null} />
            </div>
          </div>
        </div>

        {user && <SideMenu aberto={menuAberto} onClose={closeMenu} user={user} />}
      </GroupProvider>
    </ShellContext.Provider>
  );
}
