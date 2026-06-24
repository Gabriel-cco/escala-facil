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
        <div className="flex flex-wrap gap-2">
          {grupos.map((grupo) => {
            const sel = grupoId === grupo.id;
            return (
              <button
                key={grupo.id}
                type="button"
                onClick={() => setGrupoId(sel ? "" : grupo.id)}
                className={`rounded-full border px-4 py-2.5 text-[13px] font-medium ${
                  sel
                    ? "border-ink bg-ink text-paper"
                    : "border-black/10 bg-transparent text-ink"
                }`}
              >
                {grupo.nome}
              </button>
            );
          })}
          {grupos.length === 0 && (
            <p className="text-[13px] text-muted">
              Cadastre um grupo antes de criar eventos.
            </p>
          )}
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
