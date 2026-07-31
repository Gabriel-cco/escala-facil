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
  grupos: { id: string; name: string }[];
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 pb-10 md:p-6">
      <div className="flex w-full max-w-[480px] flex-col md:rounded-[24px] md:border md:border-black/[0.07] md:bg-paper md:p-12 md:shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
        <h1 className="font-serif text-[26px] font-semibold text-ink">
          Selecionar grupo
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          Escolha um grupo para filtrar a visão, ou acesse a visão geral com
          todos os grupos.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            onClick={() => selecionar(null)}
            className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-paper px-5 py-4 text-left transition-colors hover:bg-surface"
          >
            <span className="font-serif text-[17px] font-semibold text-ink">
              Todos os grupos
            </span>
            <span className="text-[20px] text-[#bdbdb9]">›</span>
          </button>

          {grupos.map((grupo) => (
            <button
              key={grupo.id}
              onClick={() => selecionar(grupo.id)}
              className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-paper px-5 py-4 text-left transition-colors hover:bg-surface"
            >
              <span className="font-serif text-[17px] font-semibold text-ink">
                {grupo.name}
              </span>
              <span className="text-[20px] text-[#bdbdb9]">›</span>
            </button>
          ))}
        </div>

        <button
          onClick={sair}
          className="mt-8 text-[13px] font-semibold text-muted hover:text-ink"
        >
          Sair da conta
        </button>
      </div>
    </main>
  );
}
