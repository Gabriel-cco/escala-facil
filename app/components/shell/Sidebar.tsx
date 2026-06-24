"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";

// Navegação web: todos os itens (handoff), incluindo Funções.
const itens = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/membros", label: "Membros" },
  { href: "/grupos", label: "Grupos" },
  { href: "/funcoes", label: "Funções" },
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
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#c6c6c2] text-center font-serif text-[9px] font-semibold leading-none text-[#3a3a38]">
          esc
          <br />
          fác
        </span>
        <span className="font-serif text-[19px] font-semibold text-ink">
          Escala Fácil
        </span>
      </Link>

      {/* Navegação */}
      <nav className="flex flex-col gap-[3px]">
        {itens.map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[11px] rounded-[11px] px-[13px] py-[11px] text-[14px] ${
                ativo
                  ? "bg-ink font-semibold text-paper"
                  : "font-medium text-[#5d5d5a]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  ativo ? "bg-paper" : "bg-transparent"
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
        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-paper">
          {user.iniciais || "··"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">
            {user.nome}
          </div>
          <div className="text-[11.5px] text-muted">Coordenador</div>
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
