"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";
import { ROTULO_PERFIL } from "./AppShell";
import SeletorGrupo from "./SeletorGrupo";
import Avatar from "@/app/components/Avatar";

const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

type NavItem = { href: string; label: string; menuKey?: string };

const NAV_ADMIN: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/grupos", label: "Grupos" },
  { href: "/membros", label: "Membros", menuKey: "membros" },
  { href: "/funcoes", label: "Funções", menuKey: "funcoes" },
  { href: "/ministerios", label: "Ministérios", menuKey: "ministerios" },
  { href: "/eventos", label: "Eventos", menuKey: "eventos" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/frequencia", label: "Frequência", menuKey: "frequencia" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/perfil", label: "Meu Perfil" },
];

const NAV_COORDINATOR: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/membros", label: "Membros", menuKey: "membros" },
  { href: "/funcoes", label: "Funções", menuKey: "funcoes" },
  { href: "/ministerios", label: "Ministérios", menuKey: "ministerios" },
  { href: "/eventos", label: "Eventos", menuKey: "eventos" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/frequencia", label: "Frequência", menuKey: "frequencia" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/perfil", label: "Meu Perfil" },
];

const NAV_MEMBER: NavItem[] = [
  { href: "/minha-escala", label: "Minha Escala" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/perfil", label: "Meu Perfil" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SideMenu({
  aberto,
  onClose,
  user,
}: {
  aberto: boolean;
  onClose: () => void;
  user: ShellUser;
}) {
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  if (!aberto) return null;

  const navItems = (
    user.perfil === "member"
      ? NAV_MEMBER
      : user.perfil === "coordinator"
      ? NAV_COORDINATOR
      : NAV_ADMIN
  ).filter((item) => !item.menuKey || !user.hiddenMenuKeys.includes(item.menuKey));

  const withOwner =
    user.perfil === "admin" && user.email === OWNER_EMAIL
      ? [...navItems, { href: "/relatorio-uso", label: "Relatório de Uso" }, { href: "/admin/menus", label: "Menus por Grupo" }]
      : navItems;

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div
        onClick={onClose}
        className="ef-backdrop fixed inset-0 z-40 bg-black/30"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[440px]">
        <div className="ef-sheet flex max-h-[85dvh] flex-col rounded-t-[26px] bg-[#ffffff] pt-3.5">
          <div className="mx-auto mb-4 h-1 w-[38px] flex-none rounded-full bg-black/20" />

          {/* Cabeçalho — não rola */}
          <div className="flex-none px-[18px]">
            <div className="mb-2 flex items-center gap-3 border-b border-black/10 px-1 pb-4 pt-1.5">
              <Avatar url={user.avatarUrl} iniciais={user.iniciais} size={46} />
              <div>
                <div className="text-[15px] font-semibold text-ink">
                  {user.nome}
                </div>
                <div className="text-[12.5px] text-muted">
                  {user.perfil ? ROTULO_PERFIL[user.perfil] : ""}
                </div>
              </div>
            </div>

            <SeletorGrupo className="mt-2 px-1" />
          </div>

          {/* Navegação — rola */}
          <nav className="flex-1 overflow-y-auto px-[18px] py-2">
            {withOwner.map((item) => {
              const ativa = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex w-full items-center px-2 py-3.5 text-[15px] transition-colors ${
                    ativa
                      ? "font-semibold text-primary"
                      : "font-medium text-ink"
                  }`}
                >
                  {ativa && (
                    <span className="mr-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé — não rola */}
          <div className="flex-none border-t border-black/[0.07] px-[18px] pb-9 pt-1">
            <button
              onClick={sair}
              disabled={saindo}
              className="w-full px-2 py-3.5 text-left text-[15px] font-medium text-danger disabled:opacity-50"
            >
              {saindo ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
