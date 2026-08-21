"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; name: string };

export default function CadastrarMembroForm({ grupos }: { grupos: Grupo[] }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  // Cada membro pertence a um único grupo (accounts.group_id).
  const [grupoId, setGrupoId] = useState("");
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

    // 1) Cria o usuário (auth_id fica nulo até o primeiro login vincular).
    const { data: usuario, error: erroUser } = await supabase
      .from("users")
      .insert({
        name: nome.trim(),
        email: email.trim(),
        cpf: cpf.trim() || null,
        birth_date: birthDate || null,
      })
      .select("id")
      .single();

    if (erroUser || !usuario) {
      setSalvando(false);
      setErro("Erro ao salvar: " + (erroUser?.message ?? "desconhecido"));
      return;
    }

    // 2) Cria o account (papel na aplicação) vinculado ao grupo.
    const { error: erroAccount } = await supabase.from("accounts").insert({
      user_id: usuario.id,
      profile: "member",
      group_id: grupoId,
    });

    if (erroAccount) {
      setSalvando(false);
      setErro("Erro ao salvar o acesso: " + erroAccount.message);
      return;
    }

    // Fecha o modal interceptor (router.back) e revalida a lista. Usar
    // replace("/membros") não desmonta o slot @modal de forma confiável.
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
        <p className="mt-1.5 text-[11.5px] text-muted">
          Usado para vincular o acesso quando a pessoa entrar com o Google.
        </p>
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

      <div>
        <div className="mb-2.5 text-[12px] font-semibold text-muted">GRUPO</div>
        {grupos.length === 0 ? (
          <p className="text-[13px] text-muted">
            Cadastre um grupo antes de cadastrar membros.
          </p>
        ) : (
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
        )}
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
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar membro"}
        </button>
      </div>
    </div>
  );
}
