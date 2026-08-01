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
];

const ITENS_COORDINATOR = [
  { href: "/", label: "Início" },
  { href: "/membros", label: "Membros" },
  { href: "/funcoes", label: "Funções" },
  { href: "/eventos", label: "Eventos" },
];

const ITENS_MEMBER = [
  { href: "/minha-escala", label: "Minha Escala" },
];

function itemAtivo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
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
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-primary-light text-center font-serif text-[9px] font-semibold leading-none text-primary">
          esc
          <br />
          fác
        </span>
        <span className="font-serif text-[19px] font-semibold text-ink">
          Escala Fácil
        </span>
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
              className={`flex items-center gap-[11px] rounded-lg px-[13px] py-[11px] text-[14px] transition-colors ${
                ativo
                  ? "bg-primary-light font-semibold text-primary"
                  : "font-medium text-muted hover:bg-surface"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  ativo ? "bg-primary" : "bg-transparent"
                }`}
              />
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
