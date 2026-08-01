"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ShellUser } from "./AppShell";

type Aba = { href: string; label: string };

const ABAS_ADMIN: Aba[] = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/membros", label: "Membros" },
  { href: "/grupos", label: "Grupos" },
];

const ABAS_COORDINATOR: Aba[] = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/membros", label: "Membros" },
  { href: "/funcoes", label: "Funções" },
];

const ABAS_MEMBER: Aba[] = [
  { href: "/minha-escala", label: "Minha Escala" },
];

const TELAS_RAIZ = [
  "/", "/eventos", "/membros", "/grupos", "/funcoes", "/usuarios", "/minha-escala",
];

function abaAtiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TabBar({
  perfil,
}: {
  perfil: ShellUser["perfil"];
}) {
  const pathname = usePathname();

  if (!TELAS_RAIZ.includes(pathname)) return null;

  const abas =
    perfil === "member"
      ? ABAS_MEMBER
      : perfil === "coordinator"
      ? ABAS_COORDINATOR
      : ABAS_ADMIN;

  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-border bg-paper px-2 pb-7 pt-2.5 md:hidden">
      {abas.map((aba) => {
        const ativa = abaAtiva(pathname, aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className="flex flex-1 flex-col items-center gap-1.5 py-1"
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                ativa ? "bg-primary" : "bg-transparent"
              }`}
            />
            <span
              className={`text-[11.5px] ${
                ativa ? "font-bold text-primary" : "font-medium text-tab-off"
              }`}
            >
              {aba.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
