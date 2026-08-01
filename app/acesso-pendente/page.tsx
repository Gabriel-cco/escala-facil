"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AcessoPendentePage() {
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 pb-10 md:p-6">
      <div className="flex w-full max-w-[420px] flex-col items-center text-center md:rounded-[24px] md:border md:border-black/[0.07] md:bg-paper md:p-12 md:shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-[30px] text-primary">
          ⏳
        </div>

        <h1 className="font-serif text-[24px] font-semibold text-ink">
          Acesso ainda não configurado
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          Seu login foi realizado, mas seu acesso ainda não foi liberado. Entre
          em contato com o administrador da sua paróquia para que ele configure
          seu perfil.
        </p>

        <button
          onClick={sair}
          disabled={saindo}
          className="mt-8 w-full rounded-2xl border border-black/10 bg-paper py-3.5 text-[14.5px] font-semibold text-ink disabled:opacity-50 md:bg-white"
        >
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </main>
  );
}
