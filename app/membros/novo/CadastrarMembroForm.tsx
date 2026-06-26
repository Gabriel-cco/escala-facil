"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; nome: string };

export default function CadastrarMembroForm({ grupos }: { grupos: Grupo[] }) {
  const [nome, setNome] = useState("");
  // O schema atual associa o membro a um único grupo (members.group_id).
  const [grupoId, setGrupoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("members")
      .insert({ nome: nome.trim(), group_id: grupoId });

    if (error) {
      setSalvando(false);
      setErro("Erro ao salvar: " + error.message);
      return;
    }

    router.replace("/membros");
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
                  {grupo.nome}
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
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar membro"}
        </button>
      </div>
    </div>
  );
}
