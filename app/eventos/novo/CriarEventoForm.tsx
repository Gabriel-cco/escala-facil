"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLiturgicalInfoAction } from "@/lib/liturgical-actions";
import type { LiturgicalInfo } from "@/lib/liturgical";
import { withRetry } from "@/lib/retry";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Ministerio = { id: string; name: string };

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

// TEMPORÁRIO: campo de ministério visível só para o dono da plataforma.
// Revisitar quando decidirmos como abrir essa capacidade para outros coordenadores.
export default function CriarEventoForm({
  grupos,
  ministeriosPorGrupo,
  podeGerenciarMinisterios,
  accountId,
}: {
  grupos: Grupo[];
  ministeriosPorGrupo: Record<string, Ministerio[]>;
  podeGerenciarMinisterios: boolean;
  accountId?: string;
}) {
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [grupoIds, setGrupoIds] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [liturgico, setLiturgico] = useState<LiturgicalInfo | null>(null);

  // Ministério
  const [ministerioId, setMinisterioId] = useState("");
  const [ministeriosExtras, setMinisteriosExtras] = useState<Ministerio[]>([]);
  const [novoMinNome, setNovoMinNome] = useState("");
  const [mostrarNovoMin, setMostrarNovoMin] = useState(false);
  const [criandoMin, setCriandoMin] = useState(false);

  const router = useRouter();

  const dataEfetiva = data || hojeStr();

  useEffect(() => {
    let cancelado = false;
    withRetry(() => getLiturgicalInfoAction(dataEfetiva), { tentativas: 2 })
      .then((info) => {
        if (!cancelado) setLiturgico(info);
      })
      .catch(() => {
        if (!cancelado) setLiturgico(null);
      });
    return () => {
      cancelado = true;
    };
  }, [dataEfetiva]);

  const todosSelecionados =
    grupos.length > 0 && grupoIds.size === grupos.length;

  // Ministério só faz sentido quando há exatamente 1 grupo selecionado
  const grupoIdUnico = grupoIds.size === 1 ? [...grupoIds][0] : null;
  const ministeriosBase = grupoIdUnico ? (ministeriosPorGrupo[grupoIdUnico] ?? []) : [];
  const todosMinisterios = [...ministeriosBase, ...ministeriosExtras].sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR")
  );
  const mostrarCampoMinisterio = grupoIdUnico !== null && podeGerenciarMinisterios;

  function clearMinisterio() {
    setMinisterioId("");
    setMinisteriosExtras([]);
    setMostrarNovoMin(false);
    setNovoMinNome("");
  }

  function toggleGrupo(id: string) {
    setGrupoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    clearMinisterio();
  }

  function toggleTodos() {
    setGrupoIds(todosSelecionados ? new Set() : new Set(grupos.map((g) => g.id)));
    clearMinisterio();
  }

  async function criarMinisterioInline() {
    const nome = novoMinNome.trim();
    if (!nome || !grupoIdUnico || criandoMin) return;
    setCriandoMin(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ministerios")
      .insert({ group_id: grupoIdUnico, name: nome })
      .select("id, name")
      .single();
    setCriandoMin(false);
    if (error) return;
    const novo = data as Ministerio;
    setMinisteriosExtras((prev) =>
      [...prev, novo].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    );
    setMinisterioId(novo.id);
    setNovoMinNome("");
    setMostrarNovoMin(false);
  }

  const podeSalvar = nome.trim().length > 0 && grupoIds.size > 0;

  async function criar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    const dataFinal = dataEfetiva;
    const horaFinal = `${hora || "00:00"}:00`;

    const rows = [...grupoIds].map((gid) => ({
      name: nome.trim(),
      date: dataFinal,
      time: horaFinal,
      group_id: gid,
      liturgical_name: liturgico?.name ?? null,
      liturgical_color: liturgico?.color ?? null,
      ministerio_id: grupoIdUnico === gid ? (ministerioId || null) : null,
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

    if (accountId) logAccess(accountId, "criar_evento", { count: criados.length });

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

      {mostrarCampoMinisterio && (
        <div>
          <div className={labelInput}>
            MINISTÉRIO RESPONSÁVEL{" "}
            <span className="text-[10px] font-normal normal-case text-faint">(opcional)</span>
          </div>
          <select
            value={ministerioId}
            onChange={(e) => setMinisterioId(e.target.value)}
            className={`${baseInput} appearance-none px-4 py-3.5 text-[14px] ${
              ministerioId ? "text-ink" : "text-muted"
            }`}
          >
            <option value="">Nenhum</option>
            {todosMinisterios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {!mostrarNovoMin ? (
            <button
              type="button"
              onClick={() => setMostrarNovoMin(true)}
              className="mt-1.5 text-[12.5px] font-medium text-primary hover:underline"
            >
              + Novo ministério
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={novoMinNome}
                onChange={(e) => setNovoMinNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") criarMinisterioInline();
                }}
                placeholder="Nome do ministério"
                className="flex-1 rounded-[12px] border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={criarMinisterioInline}
                disabled={!novoMinNome.trim() || criandoMin}
                className="rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                {criandoMin ? "..." : "Criar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarNovoMin(false);
                  setNovoMinNome("");
                }}
                className="rounded-[12px] border border-black/10 px-3.5 py-2.5 text-[13px] font-semibold text-ink"
              >
                ×
              </button>
            </div>
          )}
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
