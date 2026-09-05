"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";
import { ROTULO_PERFIL } from "./AppShell";
import SeletorGrupo from "./SeletorGrupo";
import Avatar from "@/app/components/Avatar";

type NavItem = { href: string; label: string; menuKey?: string };

const ITENS_ADMIN: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/grupos", label: "Grupos" },
  { href: "/membros", label: "Membros", menuKey: "membros" },
  { href: "/funcoes", label: "Funções", menuKey: "funcoes" },
  { href: "/ministerios", label: "Ministérios", menuKey: "ministerios" },
  { href: "/eventos", label: "Eventos", menuKey: "eventos" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/perfil", label: "Meu Perfil" },
];

const ITENS_COORDINATOR: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/membros", label: "Membros", menuKey: "membros" },
  { href: "/funcoes", label: "Funções", menuKey: "funcoes" },
  { href: "/ministerios", label: "Ministérios", menuKey: "ministerios" },
  { href: "/eventos", label: "Eventos", menuKey: "eventos" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/perfil", label: "Meu Perfil" },
];

const ITENS_MEMBER: NavItem[] = [
  { href: "/minha-escala", label: "Minha Escala" },
  { href: "/trocas", label: "Trocas", menuKey: "trocas" },
  { href: "/perfil", label: "Meu Perfil" },
];

function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Ícone de cada item da navegação (herda a cor via currentColor). */
const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

function IconeNav({ href }: { href: string }) {
  const p = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (href) {
    case "/":
      return (
        <svg {...p}>
          <path d="M3 10.6 12 3l9 7.6" />
          <path d="M5.2 9.3V21h13.6V9.3" />
        </svg>
      );
    case "/grupos":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v9h9" />
        </svg>
      );
    case "/membros":
      return (
        <svg {...p}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M15.4 5.3a3.2 3.2 0 0 1 0 6.4" />
          <path d="M3.3 20c.5-3.3 2.9-5.2 5.7-5.2s5.2 1.9 5.7 5.2" />
          <path d="M16 15c2.3.3 4 2.2 4.5 5" />
        </svg>
      );
    case "/funcoes":
      return (
        <svg {...p}>
          <path d="M12 3.2l1.9 5.1L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z" />
        </svg>
      );
    case "/eventos":
      return (
        <svg {...p}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
          <path d="M3.5 9.5h17M8 3.2v3.6M16 3.2v3.6" />
        </svg>
      );
    case "/trocas":
      return (
        <svg {...p}>
          <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M14 4l-4 16" />
        </svg>
      );
    case "/notificacoes":
      return (
        <svg {...p}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "/perfil":
      return (
        <svg {...p}>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <circle cx="8.5" cy="10.5" r="2" />
          <path d="M13 10.5h4.5M13 13.5h3" />
        </svg>
      );
    case "/ministerios":
      return (
        <svg {...p}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "/relatorio-uso":
      return (
        <svg {...p}>
          <rect x="3" y="12" width="4" height="8" rx="1" />
          <rect x="10" y="8" width="4" height="12" rx="1" />
          <rect x="17" y="4" width="4" height="16" rx="1" />
        </svg>
      );
    case "/admin/menus":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
      );
    default:
      return null;
  }
}

/** Sidebar fixa (248px) do layout web: logo + navegação + usuário/Sair. */
export default function Sidebar({
  className = "",
  user,
}: {
  className?: string;
  user: ShellUser;
}) {
  const [saindo, setSaindo] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`w-[248px] flex-none flex-col border-r border-black/[0.07] bg-paper px-4 py-[22px] ${className}`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-[11px] px-2 pb-[22px] pt-1">
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-primary text-[17px] font-bold leading-none text-white">
          E
        </span>
        <span className="text-[18px] font-bold text-ink">Escala Fácil</span>
      </Link>

      {/* Grupo ativo (dropdown para admin; fixo para os demais) */}
      <SeletorGrupo className="mb-4 px-1" />

      {/* Navegação */}
      <nav className="flex flex-col gap-[3px]">
        {(user.perfil === "member"
          ? ITENS_MEMBER
          : user.perfil === "coordinator"
          ? ITENS_COORDINATOR
          : ITENS_ADMIN
        ).filter((item) => !item.menuKey || !user.hiddenMenuKeys.includes(item.menuKey)).map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={
                item.href === "/eventos"
                  ? "nav-eventos"
                  : item.href === "/trocas"
                  ? "nav-trocas"
                  : undefined
              }
              className={`flex items-center gap-[11px] rounded-lg px-[13px] py-[10px] text-[14px] transition-colors ${
                ativo
                  ? "bg-primary-light font-semibold text-primary"
                  : "font-medium text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <span className={ativo ? "text-primary" : "text-faint"}>
                <IconeNav href={item.href} />
              </span>
              {item.label}
            </Link>
          );
        })}
        {/* Links exclusivos do dono da plataforma */}
        {user.email === OWNER_EMAIL && (
          <>
            {[
              { href: "/relatorio-uso", label: "Relatório" },
              { href: "/admin/menus", label: "Menus" },
            ].map(({ href, label }) => {
              const ativo = itemAtivo(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-[11px] rounded-lg px-[13px] py-[10px] text-[14px] transition-colors ${
                    ativo
                      ? "bg-primary-light font-semibold text-primary"
                      : "font-medium text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <span className={ativo ? "text-primary" : "text-faint"}>
                    <IconeNav href={href} />
                  </span>
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="flex-1" />

      {/* Usuário + Sair */}
      <div className="flex items-center gap-[11px] border-t border-black/[0.07] pt-3.5">
        <Avatar url={user.avatarUrl} iniciais={user.iniciais} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">
            {user.nome}
          </div>
          <div className="text-[11.5px] text-muted">
            {user.perfil ? ROTULO_PERFIL[user.perfil] : ""}
          </div>
        </div>
        <button
          onClick={sair}
          disabled={saindo}
          title="Sair"
          className="flex-none text-[12.5px] font-semibold text-danger disabled:opacity-50"
        >
          {saindo ? "..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
