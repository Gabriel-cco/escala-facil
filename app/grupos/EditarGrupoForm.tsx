"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditarGrupoForm({
  id,
  nomeInicial,
  descricaoInicial,
}: {
  id: string;
  nomeInicial: string;
  descricaoInicial: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [descricao, setDescricao] = useState(descricaoInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const podeSalvar = nome.trim().length > 0;

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ name: nome.trim(), description: descricao.trim() || null })
      .eq("id", id);
    if (error) {
      setSalvando(false);
      setErro("Erro ao salvar: " + error.message);
      return;
    }
    router.back();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          NOME DO GRUPO
        </div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Coroinhas, Música, Ministros"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          DESCRIÇÃO (OPCIONAL)
        </div>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Uma breve descrição"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
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
          {salvando ? "Salvando..." : "Salvar grupo"}
        </button>
      </div>
    </div>
  );
}
