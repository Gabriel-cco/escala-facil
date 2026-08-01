"use client";

import { useRouter } from "next/navigation";
import { ACTIVE_GROUP_COOKIE } from "@/lib/active-group";
import { createClient } from "@/lib/supabase/client";

function gravarCookie(valor: string | null) {
  if (valor) {
    document.cookie = `${ACTIVE_GROUP_COOKIE}=${encodeURIComponent(valor)}; path=/; max-age=31536000; samesite=lax`;
  } else {
    document.cookie = `${ACTIVE_GROUP_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

export default function SelecionarGrupoForm({
  grupos,
}: {
  grupos: { id: string; name: string; membroCount: number }[];
}) {
  const router = useRouter();

  function selecionar(groupId: string | null) {
    gravarCookie(groupId);
    router.push("/");
    router.refresh();
  }

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-10 md:p-6">
      <div className="flex w-full max-w-[520px] flex-col rounded-[24px] bg-white p-7 shadow-[0_12px_44px_rgba(79,70,229,0.08)] ring-1 ring-black/[0.04] md:p-10">
        {/* Marca + título */}
        <div className="flex flex-col items-center text-center">
          <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[16px] bg-primary text-[24px] font-bold leading-none text-white">
            E
          </span>
          <h1 className="mt-5 text-[22px] font-bold tracking-tight text-ink">
            Em qual área você quer atuar?
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            Escolha um grupo para gerenciar, ou veja tudo de uma vez.
          </p>
        </div>

        {/* Visão geral (destacado) */}
        <button
          onClick={() => selecionar(null)}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-light px-4 py-3.5 text-left transition-colors hover:bg-[#e6e6fb]"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-primary text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 21 12 12 21 3 12z" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold text-primary">
              Visão geral
            </span>
            <span className="block text-[12px] text-primary/70">
              Todos os grupos e eventos
            </span>
          </span>
          <span className="text-[18px] text-primary">→</span>
        </button>

        <div className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
          Ou escolha um grupo
        </div>

        <div className="flex flex-col gap-2.5">
          {grupos.map((grupo) => (
            <button
              key={grupo.id}
              onClick={() => selecionar(grupo.id)}
              className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 text-left transition-colors hover:bg-surface"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold text-avatar-ink">
                {grupo.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-ink">
                  {grupo.name}
                </span>
                <span className="block text-[12px] text-muted">
                  {grupo.membroCount} membro{grupo.membroCount !== 1 ? "s" : ""}
                </span>
              </span>
              <span className="text-[18px] text-faint">›</span>
            </button>
          ))}
        </div>

        <button
          onClick={sair}
          className="mt-7 self-center text-[13px] font-semibold text-muted hover:text-ink"
        >
          Sair da conta
        </button>
      </div>
    </main>
  );
}
