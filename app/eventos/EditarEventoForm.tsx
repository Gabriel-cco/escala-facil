"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLiturgicalInfoAction } from "@/lib/liturgical-actions";
import type { LiturgicalColor } from "@/lib/liturgical";
import { withRetry } from "@/lib/retry";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Ministerio = { id: string; name: string };

const labelInput = "mb-2 text-[12px] font-semibold text-muted";
const baseInput =
  "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";

// TEMPORÁRIO: campo de ministério visível só para o dono da plataforma.
// Revisitar quando decidirmos como abrir essa capacidade para outros coordenadores.
export default function EditarEventoForm({
  id,
  nomeInicial,
  dataInicial,
  horaInicial,
  grupoIdInicial,
  liturgicalNameInicial,
  liturgicalColorInicial,
  ministerioIdInicial,
  observacoesInicial,
  grupos,
  ministeriosPorGrupo,
  podeGerenciarMinisterios,
  accountId,
}: {
  id: string;
  nomeInicial: string;
  dataInicial: string;
  horaInicial: string;
  grupoIdInicial: string;
  liturgicalNameInicial: string | null;
  liturgicalColorInicial: string | null;
  ministerioIdInicial: string | null;
  observacoesInicial?: string | null;
  grupos: Grupo[];
  ministeriosPorGrupo: Record<string, Ministerio[]>;
  podeGerenciarMinisterios: boolean;
  accountId?: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState(horaInicial.slice(0, 5));
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [liturgicalName, setLiturgicalName] = useState(liturgicalNameInicial ?? "");
  const [liturgicalColor, setLiturgicalColor] = useState<LiturgicalColor | null>(
    (liturgicalColorInicial as LiturgicalColor | null) ?? null
  );

  // Ministério
  const [ministerioId, setMinisterioId] = useState(ministerioIdInicial ?? "");
  const [ministeriosExtras, setMinisteriosExtras] = useState<Ministerio[]>([]);
  const [novoMinNome, setNovoMinNome] = useState("");
  const [mostrarNovoMin, setMostrarNovoMin] = useState(false);
  const [criandoMin, setCriandoMin] = useState(false);
  const [observacoes, setObservacoes] = useState(observacoesInicial ?? "");
  const [avisarEscalados, setAvisarEscalados] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState("");
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [erroIA, setErroIA] = useState("");

  const router = useRouter();

  async function organizarTexto() {
    if (!observacoes.trim() || carregandoIA) return;
    setCarregandoIA(true);
    setErroIA("");
    setSugestaoIA("");
    try {
      const res = await fetch("/api/observacoes/organizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: observacoes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      setSugestaoIA(data.textoOrganizado);
    } catch {
      setErroIA("Não foi possível organizar agora — tente de novo.");
    } finally {
      setCarregandoIA(false);
    }
  }

  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    let cancelado = false;
    withRetry(() => getLiturgicalInfoAction(data), { tentativas: 2 })
      .then((info) => {
        if (cancelado) return;
        setLiturgicalName(info?.name ?? "");
        setLiturgicalColor(info?.color ?? null);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [data]);

  const ministeriosBase = ministeriosPorGrupo[grupoId] ?? [];
  const todosMinisterios = [...ministeriosBase, ...ministeriosExtras].sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR")
  );
  const mostrarCampoMinisterio = podeGerenciarMinisterios;

  function handleGrupoChange(newGrupoId: string) {
    setGrupoId(newGrupoId);
    if (newGrupoId !== grupoId) {
      setMinisterioId("");
      setMinisteriosExtras([]);
      setMostrarNovoMin(false);
      setNovoMinNome("");
    }
  }

  async function criarMinisterioInline() {
    const nome = novoMinNome.trim();
    if (!nome || criandoMin) return;
    setCriandoMin(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ministerios")
      .insert({ group_id: grupoId, name: nome })
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

  const podeSalvar = nome.trim().length > 0 && grupoId !== "";

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const horaFinal = `${hora || "00:00"}:00`;
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({
        name: nome.trim(),
        date: data,
        time: horaFinal,
        group_id: grupoId,
        liturgical_name: liturgicalName.trim() || null,
        liturgical_color: liturgicalColor,
        ministerio_id: ministerioId || null,
        observacoes: observacoes.trim() || null,
      })
      .eq("id", id);
    if (error) {
      setSalvando(false);
      setErro("Erro ao salvar: " + error.message);
      return;
    }
    if (accountId) logAccess(accountId, "editar_evento", { event_id: id });
    if (avisarEscalados && observacoes.trim()) {
      await fetch(`/api/events/${id}/notify-observacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacoes: observacoes.trim() }),
        credentials: "include",
      }).catch(() => {});
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
            onChange={(e) => handleGrupoChange(e.target.value)}
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

      {mostrarCampoMinisterio && (
        <div>
          <div className={labelInput}>
            MINISTÉRIO RESPONSÁVEL{" "}
            <span className="text-[10px] font-normal normal-case text-faint">(opcional)</span>
          </div>
          <div className="relative">
            <select
              value={ministerioId}
              onChange={(e) => setMinisterioId(e.target.value)}
              className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[14px] outline-none ${
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
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              ▾
            </span>
          </div>

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

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className={labelInput}>OBSERVAÇÕES PARA O DIA</span>
          <span className={`text-[11.5px] tabular-nums ${observacoes.length > 2000 ? "text-amber-500" : "text-faint"}`}>
            {observacoes.length}/2000
          </span>
        </div>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex.: Trazer cadeiras extras, missa ao ar livre…"
          rows={3}
          className={`${baseInput} resize-none px-4 py-3 text-[14px] leading-relaxed`}
        />
        {observacoes.trim().length > 0 && (
          <>
            <button
              type="button"
              onClick={organizarTexto}
              disabled={carregandoIA}
              className="mt-2 text-[12.5px] font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {carregandoIA ? "Organizando…" : "✦ Organizar com IA"}
            </button>
            {erroIA && <p className="mt-1 text-[12px] text-danger">{erroIA}</p>}
            {sugestaoIA && (
              <div className="mt-3 rounded-[14px] border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-primary">
                  Sugestão da IA
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                  {sugestaoIA}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setObservacoes(sugestaoIA); setSugestaoIA(""); }}
                    className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-white"
                  >
                    Usar esta versão
                  </button>
                  <button
                    type="button"
                    onClick={() => setSugestaoIA("")}
                    className="rounded-[10px] border border-black/10 px-4 py-2 text-[13px] font-semibold text-ink"
                  >
                    Manter original
                  </button>
                </div>
              </div>
            )}
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                checked={avisarEscalados}
                onChange={(e) => setAvisarEscalados(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              Avisar quem está escalado
            </label>
          </>
        )}
      </div>

      <div>
        <div className={labelInput}>NOME LITÚRGICO</div>
        <input
          value={liturgicalName}
          onChange={(e) => setLiturgicalName(e.target.value)}
          placeholder="Ex.: 18º Domingo do Tempo Comum"
          className={`${baseInput} px-4 py-3.5 text-[15px]`}
        />
        <div className="mt-3">
          <div className={labelInput}>COR LITÚRGICA</div>
          <div className="flex flex-wrap gap-2">
            {(["green", "white", "purple", "red"] as const).map((cor) => {
              const labels = { green: "Verde", white: "Branco", purple: "Roxo", red: "Vermelho" };
              const dots = { green: "bg-green-500", white: "bg-gray-300 border border-gray-400", purple: "bg-purple-500", red: "bg-red-500" };
              const sel = liturgicalColor === cor;
              return (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setLiturgicalColor(sel ? null : cor)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                    sel ? "border-primary bg-primary/10 text-primary" : "border-black/10 bg-paper text-ink hover:bg-surface"
                  }`}
                >
                  <span className={`inline-block h-2.5 w-2.5 flex-none rounded-full ${dots[cor]}`} />
                  {labels[cor]}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-[12px] text-faint">
          Nome e cor são preenchidos automaticamente pelo calendário litúrgico. Recalculados se
          a data mudar — edite se quiser personalizar.
        </p>
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
