"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";
import { ROTULO_PERFIL } from "./AppShell";
import SeletorGrupo from "./SeletorGrupo";

const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

/** Menu lateral em bottom-sheet (handoff): perfil + ações + Sair. */
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

  if (!aberto) return null;

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
        <div className="ef-sheet rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5">
          <div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-black/20" />

          <div className="mb-2 flex items-center gap-3 border-b border-black/10 px-1 pb-4 pt-1.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary-light text-[15px] font-semibold text-primary">
              {user.iniciais || "··"}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-ink">
                {user.nome}
              </div>
              <div className="text-[12.5px] text-muted">
                {user.perfil ? ROTULO_PERFIL[user.perfil] : ""}
              </div>
            </div>
          </div>

          {/* Grupo ativo (dropdown para admin; fixo para os demais) */}
          <SeletorGrupo className="mb-1 mt-2 px-1" />

          {/* Navegação — itens fora da TabBar (só para admin e coordinator) */}
          {user.perfil !== "member" && (
            <div className="border-b border-black/[0.07] py-1">
              {user.perfil === "coordinator" && (
                <Link href="/funcoes" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                  <span className="text-faint">✦</span> Funções
                </Link>
              )}
              {user.perfil === "admin" && (
                <>
                  <Link href="/funcoes" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                    <span className="text-faint">✦</span> Funções
                  </Link>
                  <Link href="/usuarios" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                    <span className="text-faint">👤</span> Usuários
                  </Link>
                  <Link href="/trocas" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                    <span className="text-faint">⇄</span> Trocas
                  </Link>
                </>
              )}
              <Link href="/frequencia" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                <span className="text-faint">✓</span> Frequência
              </Link>
              <Link href="/notificacoes" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                <span className="text-faint">🔔</span> Notificações
              </Link>
              {user.email === OWNER_EMAIL && (
                <Link href="/relatorio-uso" onClick={onClose} className="flex items-center gap-2.5 w-full px-1.5 py-3 text-[14.5px] text-ink">
                  <span className="text-faint">📊</span> Relatório de Uso
                </Link>
              )}
            </div>
          )}

          <button
            onClick={sair}
            disabled={saindo}
            className="w-full px-1.5 py-3.5 text-left text-[14.5px] text-danger disabled:opacity-50"
          >
            {saindo ? "Saindo..." : "Sair"}
          </button>
        </div>
      </div>
    </>
  );
}
