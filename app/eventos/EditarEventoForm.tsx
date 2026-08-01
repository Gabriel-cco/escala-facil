"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; name: string };

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";

export default function EditarEventoForm({
  id,
  nomeInicial,
  dataInicial,
  horaInicial,
  grupoIdInicial,
  grupos,
}: {
  id: string;
  nomeInicial: string;
  dataInicial: string;
  horaInicial: string;
  grupoIdInicial: string;
  grupos: Grupo[];
}) {
  const [nome, setNome] = useState(nomeInicial);
  // time stored as "HH:MM:SS" → input type=time needs "HH:MM"
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState(horaInicial.slice(0, 5));
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const horaFinal = `${hora || "00:00"}:00`;
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ name: nome.trim(), date: data, time: horaFinal, group_id: grupoId })
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
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
