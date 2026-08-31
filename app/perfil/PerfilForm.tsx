"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetTour } from "@/lib/tour";

export default function PerfilForm({
  userId,
  nomeInicial,
  email,
  birthDateInicial,
  profile,
}: {
  userId: string;
  nomeInicial: string;
  email: string;
  birthDateInicial: string;
  profile: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [birthDate, setBirthDate] = useState(birthDateInicial);
  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const router = useRouter();

  const alterado =
    nome.trim() !== nomeInicial || birthDate !== birthDateInicial;
  const podeSalvar = nome.trim().length > 0 && alterado;

  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvo(false);
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ name: nome.trim(), birth_date: birthDate || null })
      .eq("id", userId);
    setSalvando(false);
    if (error) {
      setErro("Erro ao salvar: " + error.message);
    } else {
      setSalvo(true);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">NOME</div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">E-MAIL</div>
        <input
          value={email}
          readOnly
          className="w-full cursor-not-allowed rounded-[14px] border border-black/[0.06] bg-surface px-4 py-3.5 text-[15px] text-muted outline-none"
        />
        <p className="mt-1.5 text-[11.5px] text-muted">
          Vinculado à sua conta Google — não pode ser alterado aqui.
        </p>
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          DATA DE NASCIMENTO (OPCIONAL)
        </div>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      {erro && <p className="text-[13px] text-danger">{erro}</p>}
      {salvo && (
        <p className="text-[13px] font-medium text-primary">
          Perfil atualizado com sucesso.
        </p>
      )}

      <div className="mt-1.5">
        <button
          onClick={salvar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <div className="mt-4 border-t border-black/[0.07] pt-4 flex flex-col gap-3">
        <button
          onClick={() => {
            resetTour(profile);
            router.push(profile === "member" ? "/minha-escala" : "/");
          }}
          className="text-left text-[13.5px] font-semibold text-primary"
        >
          Ver tour novamente
        </button>
        <button
          onClick={sair}
          disabled={saindo}
          className="text-left text-[13.5px] font-semibold text-danger disabled:opacity-50"
        >
          {saindo ? "Saindo..." : "Sair da conta"}
        </button>
      </div>
    </div>
  );
}
