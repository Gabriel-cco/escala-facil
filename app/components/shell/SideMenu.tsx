"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ShellUser } from "./AppShell";

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
        <div className="ef-sheet rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5">
          <div className="mx-auto mb-4 h-1 w-[38px] rounded-full bg-black/20" />

          <div className="mb-2 flex items-center gap-3 border-b border-black/10 px-1 pb-4 pt-1.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-ink text-[15px] font-semibold text-paper">
              {user.iniciais || "··"}
            </div>
            <div>
              <div className="text-[15px] font-semibold text-ink">
                {user.nome}
              </div>
              <div className="text-[12.5px] text-muted">
                Coordenador · Paróquia
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-1.5 py-3.5 text-left text-[14.5px] text-ink"
          >
            Meu perfil
          </button>
          <button
            onClick={onClose}
            className="w-full px-1.5 py-3.5 text-left text-[14.5px] text-ink"
          >
            Configurações
          </button>
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
