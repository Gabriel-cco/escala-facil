"use client";

import { useRouter } from "next/navigation";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/active-group";
import { createClient } from "@/lib/supabase/client";

export type ContaOpcao = {
  account_id: string;
  profile: "admin" | "coordinator" | "member";
  group_id: string | null;
  group_name: string | null;
};

const ROTULO: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordenador",
  member: "Membro",
};

function gravarCookie(nome: string, valor: string | null) {
  if (valor) {
    document.cookie = `${nome}=${encodeURIComponent(valor)}; path=/; max-age=31536000; samesite=lax`;
  } else {
    document.cookie = `${nome}=; path=/; max-age=0; samesite=lax`;
  }
}

export default function SelecionarContaForm({ contas }: { contas: ContaOpcao[] }) {
  const router = useRouter();

  function selecionar(conta: ContaOpcao) {
    if (conta.profile === "admin") {
      // Admin usa o fluxo de seleção de grupo
      gravarCookie(ACTIVE_ACCOUNT_COOKIE, null);
      router.push("/selecionar-grupo");
      router.refresh();
      return;
    }
    gravarCookie(ACTIVE_ACCOUNT_COOKIE, conta.account_id);
    const destino = conta.profile === "member" ? "/minha-escala" : "/";
    router.push(destino);
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
        <div className="flex flex-col items-center text-center">
          <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[16px] bg-primary text-[24px] font-bold leading-none text-white">
            E
          </span>
          <h1 className="mt-5 text-[22px] font-bold tracking-tight text-ink">
            Com qual perfil quer entrar?
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            Você tem mais de um vínculo. Escolha como quer navegar agora.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {contas.map((conta) => (
            <button
              key={conta.account_id}
              onClick={() => selecionar(conta)}
              className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-3.5 text-left transition-colors hover:bg-surface"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-avatar text-[13px] font-semibold text-avatar-ink">
                {conta.profile === "admin"
                  ? "A"
                  : (conta.group_name ?? "G").charAt(0).toUpperCase()}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-ink">
                  {conta.profile === "admin"
                    ? "Administrador"
                    : conta.group_name ?? "Grupo"}
                </span>
                <span className="block text-[12px] text-muted">
                  {ROTULO[conta.profile]}
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
