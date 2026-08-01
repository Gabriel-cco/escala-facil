"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; name: string };

export default function EditarMembroForm({
  accountId,
  userId,
  nomeInicial,
  emailInicial,
  cpfInicial,
  grupoIdInicial,
  grupos,
}: {
  accountId: string;
  userId: string;
  nomeInicial: string;
  emailInicial: string;
  cpfInicial: string;
  grupoIdInicial: string;
  grupos: Grupo[];
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [cpf, setCpf] = useState(cpfInicial);
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const podeSalvar = nome.trim().length > 0 && emailValido && grupoId !== "";

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const supabase = createClient();

    const { error: erroUser } = await supabase
      .from("users")
      .update({ name: nome.trim(), email: email.trim(), cpf: cpf.trim() || null })
      .eq("id", userId);

    if (erroUser) {
      setSalvando(false);
      setErro("Erro ao salvar: " + erroUser.message);
      return;
    }

    const { error: erroAccount } = await supabase
      .from("accounts")
      .update({ group_id: grupoId })
      .eq("id", accountId);

    if (erroAccount) {
      setSalvando(false);
      setErro("Erro ao atualizar grupo: " + erroAccount.message);
      return;
    }

    router.back();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          NOME COMPLETO
        </div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Maria Oliveira"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">E-MAIL</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@exemplo.com"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          CPF (OPCIONAL)
        </div>
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2.5 text-[12px] font-semibold text-muted">GRUPO</div>
        <div className="relative">
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] outline-none ${
              grupoId ? "text-ink" : "text-muted"
            }`}
          >
            <option value="" disabled>
              Selecione um grupo
            </option>
            {grupos.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
            ▾
          </span>
        </div>
      </div>

      {erro && <p className="text-[13px] text-danger">{erro}</p>}

      <div className="mt-1.5 flex flex-col gap-2.5 md:mt-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="hidden rounded-[11px] border border-black/10 px-5 py-3 text-[14px] font-semibold text-ink md:block"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
