"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { iniciais } from "@/lib/iniciais";

type Membro = {
  id: string;
  nome: string;
  telefone: string | null;
  ativo: boolean;
  suspenso_ate: string | null;
  groups: { nome: string } | { nome: string }[] | null;
};

export default function MembroItem({ membro }: { membro: Membro }) {
  const [mostrarSuspensao, setMostrarSuspensao] = useState(false);
  const [dataSuspensao, setDataSuspensao] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erroData, setErroData] = useState("");
  const router = useRouter();

  const grupo = Array.isArray(membro.groups) ? membro.groups[0] : membro.groups;

  // Suspenso AGORA se suspenso_ate é hoje ou futuro.
  const hoje = new Date().toISOString().split("T")[0];
  const estaSuspenso = membro.suspenso_ate != null && membro.suspenso_ate >= hoje;

  async function suspender() {
    if (!dataSuspensao) return;
    if (dataSuspensao <= hoje) {
      setErroData("A data de suspensão precisa ser futura.");
      return;
    }
    setErroData("");
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("members")
      .update({ suspenso_ate: dataSuspensao })
      .eq("id", membro.id);
    setProcessando(false);
    setMostrarSuspensao(false);
    setDataSuspensao("");
    router.refresh();
  }

  async function reativar() {
    setProcessando(true);
    const supabase = createClient();
    await supabase
      .from("members")
      .update({ suspenso_ate: null })
      .eq("id", membro.id);
    setProcessando(false);
    router.refresh();
  }

  function toggleFormulario() {
    setMostrarSuspensao((v) => !v);
    setErroData("");
    setDataSuspensao("");
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-paper px-[15px] py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-avatar text-[14px] font-semibold text-avatar-ink">
          {iniciais(membro.nome)}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="text-[14.5px] font-semibold text-ink">
            {membro.nome}
          </div>
          <div className="text-[12px] text-muted">
            {grupo?.nome ?? "Sem grupo"}
            {membro.telefone ? ` · ${membro.telefone}` : ""}
          </div>
          {estaSuspenso && (
            <div className="text-[12px] text-danger">
              Suspenso até{" "}
              {new Date(membro.suspenso_ate + "T00:00").toLocaleDateString(
                "pt-BR"
              )}
            </div>
          )}
        </div>
        <div className="ml-auto">
          {estaSuspenso ? (
            <button
              onClick={reativar}
              disabled={processando}
              className="rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-medium text-ink disabled:opacity-50"
            >
              Reativar
            </button>
          ) : (
            <button
              onClick={toggleFormulario}
              className="rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-medium text-ink"
            >
              Suspender
            </button>
          )}
        </div>
      </div>

      {mostrarSuspensao && !estaSuspenso && (
        <div className="mt-3 flex items-end gap-2 border-t border-black/[0.06] pt-3">
          <label className="flex-1 text-[12px] text-ink-soft">
            Suspenso até:
            <input
              type="date"
              value={dataSuspensao}
              min={hoje}
              onChange={(e) => setDataSuspensao(e.target.value)}
              className="mt-1 block w-full rounded-[12px] border border-black/10 bg-paper px-3 py-2 text-[14px] outline-none"
            />
          </label>
          <button
            onClick={suspender}
            disabled={processando || !dataSuspensao}
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      )}
      {erroData && <p className="mt-2 text-[12px] text-danger">{erroData}</p>}
    </div>
  );
}
