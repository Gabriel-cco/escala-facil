"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

/** Logo colorido do Google (G oficial). */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

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
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-[#f7f7fe] via-[#f0f0fb] to-[#e7e6f8] px-5 py-5 md:items-center md:justify-center md:p-6">
      {/* Mobile: cartão branco ocupando a tela. Desktop: bloco centralizado sem moldura. */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[28px] bg-white px-6 pb-8 pt-10 shadow-[0_12px_44px_rgba(79,70,229,0.10)] ring-1 ring-black/[0.04] md:w-[404px] md:flex-none md:bg-transparent md:p-10 md:shadow-none md:ring-0">
        {/* Marca: logo + título + subtítulo */}
        <div className="flex flex-1 flex-col items-center justify-center text-center md:flex-none">
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-primary text-[28px] font-bold leading-none text-white shadow-[0_10px_26px_rgba(79,70,229,0.40)]">
            E
          </div>
          <h1 className="mt-6 text-[26px] font-bold tracking-tight text-ink">
            Escala Fácil
          </h1>
          <p className="mt-2.5 max-w-[290px] text-[13.5px] leading-relaxed text-muted">
            Organize as escalas de serviço da sua paróquia em um só lugar.
          </p>
        </div>

        {/* Botão Google */}
        <button
          onClick={entrarComGoogle}
          disabled={carregando}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-[15px] font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-gray-50 disabled:opacity-50 md:mt-10 md:rounded-[14px]"
        >
          <GoogleG />
          {carregando ? "Redirecionando..." : "Continuar com Google"}
        </button>
      </div>
    </main>
  );
}
