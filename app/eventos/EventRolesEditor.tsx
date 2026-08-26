"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = { id: string; nome: string };

export default function EventRolesEditor({
  eventId,
  roles,
  initialActiveIds,
}: {
  eventId: string;
  roles: Role[];
  initialActiveIds: string[];
}) {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set(initialActiveIds));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const router = useRouter();

  function toggle(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMensagem("");
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setMensagem("");
    const supabase = createClient();

    const { error: erroDel } = await supabase
      .from("event_roles")
      .delete()
      .eq("event_id", eventId);

    if (erroDel) {
      setSalvando(false);
      setMensagem("Erro ao salvar: " + erroDel.message);
      return;
    }

    if (activeIds.size > 0) {
      const rows = [...activeIds].map((role_id) => ({ event_id: eventId, role_id }));
      const { error: erroIns } = await supabase.from("event_roles").insert(rows);
      if (erroIns) {
        setSalvando(false);
        setMensagem("Erro ao salvar: " + erroIns.message);
        return;
      }
    }

    setSalvando(false);
    setMensagem("Funções do evento atualizadas.");
    router.refresh();
  }

  const alterado =
    activeIds.size !== initialActiveIds.length ||
    initialActiveIds.some((id) => !activeIds.has(id));

  return (
    <div className="flex flex-col gap-4 rounded-[18px] border border-black/[0.07] bg-paper px-[18px] py-5 md:rounded-[20px] md:px-[22px]">
      <div>
        <div className="mb-1 text-[12px] font-semibold text-muted">
          FUNÇÕES NESTE EVENTO
        </div>
        <p className="text-[12.5px] text-faint">
          Selecione quais funções se aplicam a esta celebração específica.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const ativo = activeIds.has(role.id);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => toggle(role.id)}
              className={`rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                ativo
                  ? "border-primary bg-primary text-paper"
                  : "border-black/10 bg-paper text-ink hover:bg-surface"
              }`}
            >
              {role.nome}
            </button>
          );
        })}
      </div>
      {mensagem && <p className="text-[12.5px] text-success">{mensagem}</p>}
      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={!alterado || salvando}
          className="rounded-[11px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-paper disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "Salvar funções"}
        </button>
      </div>
    </div>
  );
}
