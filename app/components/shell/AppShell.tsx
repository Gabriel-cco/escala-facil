"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { ShellContext, type PageChrome } from "./menu-context";
import TabBar from "./TabBar";
import SideMenu from "./SideMenu";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export type ShellUser = {
  nome: string;
  email: string;
  iniciais: string;
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

  const ehLogin = pathname === "/login";

  const contextValue = {
    openMenu,
    closeMenu,
    userIniciais: user?.iniciais ?? "",
    userNome: user?.nome ?? "",
    chrome,
    setChrome,
  };

  // Login: sem chrome do app, ocupa a tela inteira.
  if (ehLogin) {
    return (
      <ShellContext.Provider value={contextValue}>
        <div className="min-h-dvh bg-screen md:bg-app">{children}</div>
      </ShellContext.Provider>
    );
  }

  return (
    <ShellContext.Provider value={contextValue}>
      <div className="min-h-dvh bg-screen md:flex md:h-dvh md:min-h-0 md:overflow-hidden md:bg-app">
        {user && <Sidebar className="hidden md:flex" user={user} />}

        <div className="flex min-w-0 flex-col md:h-dvh md:flex-1">
          {user && <Topbar className="hidden md:flex" />}

          <div className="ef-scroll flex min-h-dvh flex-col md:min-h-0 md:flex-1 md:overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col md:max-w-[980px] md:px-10 md:py-8">
              {children}
            </div>
            <TabBar />
          </div>
        </div>
      </div>

      {user && <SideMenu aberto={menuAberto} onClose={closeMenu} user={user} />}
    </ShellContext.Provider>
  );
}
