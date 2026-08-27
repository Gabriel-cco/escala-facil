"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLiturgicalInfoAction } from "@/lib/liturgical-actions";
import type { LiturgicalInfo } from "@/lib/liturgical";
import { withRetry } from "@/lib/retry";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";

function hojeStr(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(hoje.getDate()).padStart(2, "0")}`;
}

export default function CriarEventoForm({
  grupos,
  accountId,
}: {
  grupos: Grupo[];
  accountId?: string;
}) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  // O schema associa cada evento a um único grupo (events.group_id). Para
  // "impactar vários grupos" criamos um evento por grupo selecionado (lote).
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [liturgico, setLiturgico] = useState<LiturgicalInfo | null>(null);
  const router = useRouter();

  // Sem data escolhida, cai no default (hoje) — busca o litúrgico dela também.
  const dataEfetiva = data || hojeStr();

  useEffect(() => {
    let cancelado = false;
    withRetry(() => getLiturgicalInfoAction(dataEfetiva), { tentativas: 2 })
      .then((info) => {
        if (!cancelado) setLiturgico(info);
      })
      .catch(() => {
        // Informativo, não bloqueia o formulário — se falhar, só não mostra.
        if (!cancelado) setLiturgico(null);
      });
    return () => {
      cancelado = true;
    };
  }, [dataEfetiva]);

  const todosSelecionados =
    grupos.length > 0 && grupoIds.size === grupos.length;

  function toggleGrupo(id: string) {
    setGrupoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setGrupoIds(todosSelecionados ? new Set() : new Set(grupos.map((g) => g.id)));
  }

  const podeSalvar = nome.trim().length > 0 && grupoIds.size > 0;

  async function criar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    // events.date e events.time são separados e obrigatórios: aplicamos
    // defaults (hoje / 00:00) quando o usuário não preenche.
    const dataFinal = dataEfetiva;
    const horaFinal = `${hora || "00:00"}:00`;

    // Um evento por grupo selecionado. Insert com array é all-or-nothing:
    // não deixa um estado "meio criado".
    const rows = [...grupoIds].map((gid) => ({
      name: nome.trim(),
      date: dataFinal,
      time: horaFinal,
      group_id: gid,
      liturgical_name: liturgico?.name ?? null,
      liturgical_color: liturgico?.color ?? null,
    }));

    const supabase = createClient();
    const { data: criados, error } = await supabase
      .from("events")
      .insert(rows)
      .select("id, group_id");

    if (error || !criados?.length) {
      setSalvando(false);
      setErro("Erro ao salvar: " + (error?.message ?? "desconhecido"));
      return;
    }

    // Popula event_roles com todas as funções ativas de cada grupo.
    const { data: grupoRoles } = await supabase
      .from("roles")
      .select("id, group_id")
      .in("group_id", [...grupoIds])
      .eq("active", true);

    if (grupoRoles?.length) {
      const erRows: { event_id: string; role_id: string }[] = [];
      for (const ev of criados) {
        for (const r of grupoRoles) {
          if (r.group_id === ev.group_id) {
            erRows.push({ event_id: ev.id, role_id: r.id });
          }
        }
      }
      if (erRows.length) await supabase.from("event_roles").insert(erRows);
    }

    // Navegação "dura" de propósito: este form abre num modal interceptor
    // (@modal/(.)novo) e um router.replace não desmonta o slot paralelo de
    // forma confiável — o modal fica preso com o botão travado. Trocar o
    // documento fecha o modal com certeza.
    if (accountId) logAccess(accountId, "criar_evento", { count: criados.length });

    // 1 grupo → já abre a escala do evento; vários → volta pra lista.
    if (criados.length === 1) {
      window.location.replace(`/eventos/${criados[0].id}`);
    } else {
      window.location.replace(`/eventos`);
    }
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
          {liturgico && (
            <p className="mt-1.5 text-[12px] text-muted">
              📅 {liturgico.name}
            </p>
          )}
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
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[12px] font-semibold text-muted">
            {grupos.length > 1 ? "GRUPOS ENVOLVIDOS" : "GRUPO ENVOLVIDO"}
          </span>
          {grupoIds.size > 0 && (
            <span className="text-[11.5px] text-muted">
              {grupoIds.size} selecionado{grupoIds.size !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {grupos.length === 0 ? (
          <p className="text-[13px] text-muted">
            Cadastre um grupo antes de criar eventos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {grupos.length > 1 && (
              <button
                type="button"
                onClick={toggleTodos}
                className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                  todosSelecionados
                    ? "border-primary bg-primary text-white"
                    : "border-black/10 bg-paper text-ink hover:bg-surface"
                }`}
              >
                Todos
              </button>
            )}
            {grupos.map((grupo) => {
              const sel = grupoIds.has(grupo.id);
              return (
                <button
                  key={grupo.id}
                  type="button"
                  onClick={() => toggleGrupo(grupo.id)}
                  aria-pressed={sel}
                  className={`rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors ${
                    sel
                      ? "border-primary bg-primary text-white"
                      : "border-black/10 bg-paper text-ink hover:bg-surface"
                  }`}
                >
                  {grupo.name}
                </button>
              );
            })}
          </div>
        )}
        {grupoIds.size > 1 && (
          <p className="mt-2 text-[12px] text-muted">
            Será criado um evento em cada grupo selecionado.
          </p>
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
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando
            ? "Criando..."
            : grupoIds.size > 1
            ? `Criar ${grupoIds.size} eventos`
            : "Criar e montar escala"}
        </button>
      </div>
    </div>
  );
}
