"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";
import { ROTULO_PERFIL } from "./AppShell";
import SeletorGrupo from "./SeletorGrupo";

const ITENS_ADMIN = [
  { href: "/", label: "Início" },
  { href: "/grupos", label: "Grupos" },
  { href: "/membros", label: "Membros" },
  { href: "/funcoes", label: "Funções" },
  { href: "/eventos", label: "Eventos" },
  { href: "/usuarios", label: "Usuários" },
  { href: "/notificacoes", label: "Notificações" },
];

const ITENS_COORDINATOR = [
  { href: "/", label: "Início" },
  { href: "/membros", label: "Membros" },
  { href: "/funcoes", label: "Funções" },
  { href: "/eventos", label: "Eventos" },
  { href: "/notificacoes", label: "Notificações" },
];

const ITENS_MEMBER = [
  { href: "/minha-escala", label: "Minha Escala" },
];

function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Ícone de cada item da navegação (herda a cor via currentColor). */
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
    case "/usuarios":
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20c.5-3.6 3.2-5.6 6.5-5.6s6 2 6.5 5.6" />
        </svg>
      );
    case "/notificacoes":
      return (
        <svg {...p}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
        ).map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
      </nav>

      <div className="flex-1" />

      {/* Usuário + Sair */}
      <div className="flex items-center gap-[11px] border-t border-black/[0.07] pt-3.5">
        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-primary-light text-[13px] font-semibold text-primary">
          {user.iniciais || "··"}
        </div>
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
