"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grupo = { id: string; name: string };
type Qualificacao = { id: string; name: string; group_id: string };

export default function NovaFuncaoForm({
  grupos,
  qualificacoes = [],
}: {
  grupos: Grupo[];
  qualificacoes?: Qualificacao[];
}) {
  const [nome, setNome] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"pessoa" | "ministerio">("pessoa");
  const [requiredQualificationId, setRequiredQualificationId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";
  const qualificacoesDoGrupo = qualificacoes.filter((q) => q.group_id === grupoId);

  function handleGrupoChange(novoId: string) {
    const sel = grupoId === novoId;
    setGrupoId(sel ? "" : novoId);
    setRequiredQualificationId("");
  }

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    const supabase = createClient();
    const { error } = await supabase.from("roles").insert({
      name: nome.trim(),
      group_id: grupoId,
      assignment_type: assignmentType,
      required_qualification_id: assignmentType === "pessoa" ? (requiredQualificationId || null) : null,
    });

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
          NOME DA FUNÇÃO
        </div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Cruz, Vocal, 1ª Leitura"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2.5 text-[12px] font-semibold text-muted">
          GRUPO
        </div>
        <div className="flex flex-wrap gap-2">
          {grupos.map((grupo) => {
            const sel = grupoId === grupo.id;
            return (
              <button
                key={grupo.id}
                type="button"
                onClick={() => handleGrupoChange(grupo.id)}
                className={`rounded-full border px-4 py-2.5 text-[13px] font-medium ${
                  sel
                    ? "border-primary bg-primary text-paper"
                    : "border-black/10 bg-transparent text-ink"
                }`}
              >
                {grupo.name}
              </button>
            );
          })}
          {grupos.length === 0 && (
            <p className="text-[13px] text-muted">
              Cadastre um grupo antes de criar funções.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          TIPO DE ATRIBUIÇÃO
        </div>
        <div className="flex gap-2">
          {(["pessoa", "ministerio"] as const).map((tipo) => {
            const sel = assignmentType === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  setAssignmentType(tipo);
                  if (tipo === "ministerio") setRequiredQualificationId("");
                }}
                className={`rounded-full border px-4 py-2.5 text-[13px] font-medium ${
                  sel
                    ? "border-primary bg-primary text-paper"
                    : "border-black/10 bg-transparent text-ink"
                }`}
              >
                {tipo === "pessoa" ? "Pessoa" : "Ministério"}
              </button>
            );
          })}
        </div>
      </div>

      {assignmentType === "pessoa" && qualificacoesDoGrupo.length > 0 && (
        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">
            EXIGE QUALIFICAÇÃO
          </div>
          <div className="relative">
            <select
              value={requiredQualificationId}
              onChange={(e) => setRequiredQualificationId(e.target.value)}
              className="w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] text-ink outline-none"
            >
              <option value="">Nenhuma</option>
              {qualificacoesDoGrupo.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              ▾
            </span>
          </div>
        </div>
      )}

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
          {salvando ? "Salvando..." : "Salvar função"}
        </button>
      </div>
    </div>
  );
}
