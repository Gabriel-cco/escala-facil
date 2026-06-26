"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [carregando, setCarregando] = useState(false);

  async function entrarComGoogle() {
    setCarregando(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // O navegador é redirecionado ao Google a partir daqui.
  }

  return (
    <main className="flex min-h-dvh flex-col px-8 pb-10 md:items-center md:justify-center md:p-6">
      {/* Mobile: coluna full-height. Web: card centralizado. */}
      <div className="contents md:flex md:w-[420px] md:max-w-full md:flex-col md:rounded-[24px] md:border md:border-black/[0.07] md:bg-paper md:p-12 md:shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
        {/* Logo tipográfico */}
        <div className="flex flex-1 items-center justify-center md:flex-none md:flex-col md:gap-0">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#c6c6c2] text-center font-serif text-[19px] font-medium leading-[1.15] text-[#3a3a38] md:h-[104px] md:w-[104px] md:text-[17px]">
            escala
            <br />
            fácil
          </div>
        </div>

        {/* Título + subtítulo (web) */}
        <div className="hidden text-center md:mt-[22px] md:block">
          <div className="font-serif text-[26px] font-semibold text-ink">
            Escala Fácil
          </div>
          <div className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            Organize as escalas de serviço da sua paróquia em um só lugar.
          </div>
        </div>

        {/* Divisor com texto */}
        <div className="mb-[22px] flex items-center gap-3 md:my-[26px] md:mb-5">
          <div className="h-px flex-1 bg-black/10" />
          <div className="whitespace-nowrap text-[12.5px] text-muted">
            Entre para gerenciar as escalas
          </div>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <button
          onClick={entrarComGoogle}
          disabled={carregando}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-paper p-4 text-[15px] font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.05)] disabled:opacity-50 md:bg-white"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-track text-[12px] font-bold text-[#5a5a57]">
            G
          </span>
          {carregando ? "Redirecionando..." : "Continuar com Google"}
        </button>
      </div>
    </main>
  );
}
