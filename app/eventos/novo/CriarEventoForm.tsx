"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; nome: string };

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";

export default function CriarEventoForm({ grupos }: { grupos: Grupo[] }) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  // O schema atual associa o evento a um único grupo (events.group_id).
  const [grupoId, setGrupoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";

  async function criar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    // Combina data + hora num timestamp (hora default 00:00 se vazia).
    const dataHora = data
      ? `${data}T${hora || "00:00"}:00`
      : new Date().toISOString();

    const supabase = createClient();
    const { data: criado, error } = await supabase
      .from("events")
      .insert({ titulo: nome.trim(), data_hora: dataHora, group_id: grupoId })
      .select("id")
      .single();

    if (error || !criado) {
      setSalvando(false);
      setErro("Erro ao salvar: " + (error?.message ?? "desconhecido"));
      return;
    }

    // Vai direto para montar a escala; replace para o "voltar" cair na lista.
    router.replace(`/eventos/${criado.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={labelInput}>NOME DO EVENTO</div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Missa Dominical"
          className={`${baseInput} px-4 py-3.5 text-[15px]`}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <div className={labelInput}>DATA</div>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={`${baseInput} px-3.5 py-3 text-[14px]`}
          />
        </div>
        <div className="flex-1">
          <div className={labelInput}>HORA</div>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={`${baseInput} px-3.5 py-3 text-[14px]`}
          />
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[12px] font-semibold text-muted">
          GRUPO ENVOLVIDO
        </div>
        {grupos.length === 0 ? (
          <p className="text-[13px] text-muted">
            Cadastre um grupo antes de criar eventos.
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
          onClick={criar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Criando..." : "Criar e montar escala"}
        </button>
      </div>
    </div>
  );
}
