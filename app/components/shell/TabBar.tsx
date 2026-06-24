"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Abas inferiores (handoff): só Início, Eventos, Membros, Grupos.
const abas = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/membros", label: "Membros" },
  { href: "/grupos", label: "Grupos" },
];

// Telas raiz onde a barra de abas é visível.
const telasRaiz = ["/", "/eventos", "/membros", "/grupos", "/funcoes"];

function abaAtiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TabBar() {
  const pathname = usePathname();

  if (!telasRaiz.includes(pathname)) return null;

  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-black/10 bg-screen px-2 pb-7 pt-2.5 md:hidden">
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
                ativa ? "bg-ink" : "bg-transparent"
              }`}
            />
            <span
              className={`text-[11.5px] ${
                ativa ? "font-bold text-ink" : "font-medium text-tab-off"
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
