"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLiturgicalMonthAction } from "@/lib/liturgical-actions";
import { LiturgicalDot } from "@/app/components/LiturgicalDot";
import type { LiturgicalColor } from "@/lib/liturgical";
import { withRetry } from "@/lib/retry";

const DIAS_SEMANA = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Grupo = { id: string; name: string };
type Padrao = { id: string; nome: string; diaSemana: number; horario: string };
type ScheduleTemplate = {
  id: string;
  name: string;
  patterns: Array<{ nome: string; diaSemana: number; horario: string }>;
};
type EventoPreview = {
  key: string;
  nome: string;
  date: string;
  horario: string;
  grupoId: string;
  selecionado: boolean;
  jaExiste: boolean;
  liturgicalName: string | null;
  liturgicalColor: LiturgicalColor | null;
};

function proxMes(): string {
  const now = new Date();
  let mes = now.getMonth() + 2;
  let ano = now.getFullYear();
  if (mes > 12) { mes = 1; ano++; }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function getDatesForWeekday(year: number, month: number, weekday: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === weekday) {
      dates.push(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      );
    }
  }
  return dates;
}

function rotuloMesAno(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  return `${MESES_LONGOS[parseInt(mes) - 1]} ${ano}`;
}

function novoPadrao(): Padrao {
  return { id: Math.random().toString(36).slice(2), nome: "", diaSemana: 0, horario: "" };
}

const baseInput = "w-full rounded-[14px] border border-black/10 bg-paper text-ink outline-none";
const lb = "mb-2 text-[12px] font-semibold text-muted";

export default function GerarEventosForm({
  perfil,
  grupos,
  grupoIdInicial,
  accountId,
}: {
  perfil: string;
  grupos: Grupo[];
  grupoIdInicial: string | null;
  accountId: string;
}) {
  const [step, setStep] = useState<"configurar" | "preview">("configurar");
  const [mesAno, setMesAno] = useState(proxMes);
  const [grupoId, setGrupoId] = useState(
    grupoIdInicial ?? (grupos.length === 1 ? grupos[0].id : "")
  );
  const [padroes, setPadroes] = useState<Padrao[]>([novoPadrao()]);
  const [previewEventos, setPreviewEventos] = useState<EventoPreview[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Templates salvos
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState("");
  const [mostrarSalvarTemplate, setMostrarSalvarTemplate] = useState(false);
  const [templateNome, setTemplateNome] = useState("");
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [templateMensagem, setTemplateMensagem] = useState("");

  const router = useRouter();

  const grupoFixo = perfil === "coordinator";
  const grupoNome = grupos.find((g) => g.id === grupoId)?.name ?? "";

  // Carrega templates do grupo sempre que o grupo muda
  useEffect(() => {
    if (!grupoId) return;
    const supabase = createClient();
    supabase
      .from("schedule_templates")
      .select("id, name, patterns")
      .eq("group_id", grupoId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates((data as ScheduleTemplate[]) ?? []));
  }, [grupoId]);

  function carregarTemplate() {
    const tpl = templates.find((t) => t.id === templateSelecionadoId);
    if (!tpl) return;
    setPadroes(
      tpl.patterns.map((p) => ({
        id: Math.random().toString(36).slice(2),
        nome: p.nome,
        diaSemana: p.diaSemana,
        horario: p.horario,
      }))
    );
    setTemplateSelecionadoId("");
  }

  async function excluirTemplate(id: string) {
    const supabase = createClient();
    await supabase.from("schedule_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (templateSelecionadoId === id) setTemplateSelecionadoId("");
  }

  async function salvarTemplate() {
    if (!templateNome.trim() || !grupoId || salvandoTemplate) return;
    setSalvandoTemplate(true);
    setTemplateMensagem("");
    const supabase = createClient();
    const { error } = await supabase.from("schedule_templates").insert({
      group_id: grupoId,
      name: templateNome.trim(),
      patterns: padroes.map((p) => ({
        nome: p.nome.trim(),
        diaSemana: p.diaSemana,
        horario: p.horario,
      })),
      created_by: accountId,
    });
    setSalvandoTemplate(false);
    if (error) {
      setTemplateMensagem("Erro ao salvar: " + error.message);
    } else {
      setTemplateMensagem("Template salvo com sucesso!");
      setTemplateNome("");
      setMostrarSalvarTemplate(false);
      const { data } = await supabase
        .from("schedule_templates")
        .select("id, name, patterns")
        .eq("group_id", grupoId)
        .order("created_at", { ascending: false });
      setTemplates((data as ScheduleTemplate[]) ?? []);
    }
  }

  const podePrevisualizar =
    grupoId !== "" &&
    padroes.length > 0 &&
    padroes.every((p) => p.nome.trim() !== "" && p.horario !== "");

  function addPadrao() {
    setPadroes((prev) => [...prev, novoPadrao()]);
  }

  function removePadrao(id: string) {
    setPadroes((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePadrao(id: string, changes: Partial<Padrao>) {
    setPadroes((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  async function irParaPreview() {
    if (!podePrevisualizar || carregando) return;
    setErro("");
    setCarregando(true);

    try {
      const [ano, mes] = mesAno.split("-").map(Number);
      const supabase = createClient();

      // Nome e cor litúrgica de cada data do mês (calculado uma vez, cacheado
      // no servidor pelo ano inteiro). Retry porque essa Server Action pode
      // falhar de forma transitória (cold start, blip de rede).
      const liturgicoMes = await withRetry(() => getLiturgicalMonthAction(ano, mes));

      // Gera todos os eventos a partir dos padrões, deduplicando combinações
      // idênticas (nome+data+hora) que dois padrões iguais possam produzir.
      const vistos = new Set<string>();
      const gerados: Omit<EventoPreview, "jaExiste" | "selecionado">[] = [];
      for (const padrao of padroes) {
        for (const date of getDatesForWeekday(ano, mes, padrao.diaSemana)) {
          const nome = padrao.nome.trim();
          const assinatura = `${nome}|${date}|${padrao.horario}`;
          if (vistos.has(assinatura)) continue;
          vistos.add(assinatura);
          const liturgico = liturgicoMes[date];
          gerados.push({
            key: `${date}-${padrao.horario}-${nome}`,
            nome: nome || liturgico?.name || "Missa",
            date,
            horario: padrao.horario,
            grupoId,
            liturgicalName: liturgico?.name ?? null,
            liturgicalColor: liturgico?.color ?? null,
          });
        }
      }

      // Busca os eventos já existentes desse grupo no mês para marcar duplicatas.
      const primeiroDia = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const ultimoDia = `${ano}-${String(mes).padStart(2, "0")}-${String(diasNoMes).padStart(2, "0")}`;

      const { data: existentes, error: erroExistentes } = await supabase
        .from("events")
        .select("name, date, time")
        .eq("group_id", grupoId)
        .gte("date", primeiroDia)
        .lte("date", ultimoDia);

      if (erroExistentes) {
        setErro("Erro ao verificar eventos existentes: " + erroExistentes.message);
        return;
      }

      // "time" no banco é HH:MM:SS; o padrão usa HH:MM — normaliza na comparação.
      const setExistentes = new Set(
        (existentes ?? []).map(
          (e) =>
            `${e.name}|${e.date}|${(e.time as string).slice(0, 5)}`
        )
      );

      const eventos: EventoPreview[] = gerados.map((e) => {
        const jaExiste = setExistentes.has(`${e.nome}|${e.date}|${e.horario}`);
        return { ...e, jaExiste, selecionado: !jaExiste };
      });

      eventos.sort((a, b) =>
        `${a.date}${a.horario}`.localeCompare(`${b.date}${b.horario}`)
      );
      setPreviewEventos(eventos);
      setStep("preview");
    } catch (e) {
      setErro(
        "Não foi possível gerar a prévia: " +
          (e instanceof Error ? e.message : "erro desconhecido") +
          ". Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  function toggleEvento(key: string) {
    setPreviewEventos((prev) =>
      prev.map((e) =>
        e.key === key && !e.jaExiste ? { ...e, selecionado: !e.selecionado } : e
      )
    );
  }

  function toggleTodos(selecionar: boolean) {
    // Só afeta os novos — os que já existem ficam sempre desmarcados/travados.
    setPreviewEventos((prev) =>
      prev.map((e) => (e.jaExiste ? e : { ...e, selecionado: selecionar }))
    );
  }

  const novos = previewEventos.filter((e) => !e.jaExiste);
  const jaExistentes = previewEventos.filter((e) => e.jaExiste);
  const selecionados = previewEventos.filter((e) => e.selecionado);

  async function confirmar() {
    if (selecionados.length === 0 || carregando) return;
    setCarregando(true);
    setErro("");

    const supabase = createClient();

    // Cria SOMENTE os novos selecionados (os que já existem nem entram aqui).
    const { error: erroInsert } = await supabase.from("events").insert(
      selecionados.map((e) => ({
        name: e.nome,
        date: e.date,
        time: `${e.horario}:00`,
        group_id: e.grupoId,
        liturgical_name: e.liturgicalName,
        liturgical_color: e.liturgicalColor,
      }))
    );

    if (erroInsert) {
      setErro("Erro ao criar eventos: " + erroInsert.message);
      setCarregando(false);
      return;
    }

    router.push(grupoId ? `/eventos?grupo=${grupoId}` : "/eventos");
    router.refresh();
  }

  /* ── Passo 1: Configurar ─────────────────────────────────────────────── */
  if (step === "configurar") {
    return (
      <div className="flex flex-col gap-5">
        {/* Mês */}
        <div>
          <div className={lb}>MÊS</div>
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className={`${baseInput} px-4 py-3 text-[14px]`}
          />
        </div>

        {/* Grupo (apenas para admin) */}
        {!grupoFixo && (
          <div>
            <div className={lb}>GRUPO</div>
            {grupos.length === 0 ? (
              <p className="text-[13px] text-muted">Nenhum grupo ativo encontrado.</p>
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
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                  ▾
                </span>
              </div>
            )}
          </div>
        )}

        {/* Templates salvos */}
        {grupoId && templates.length > 0 && (
          <div>
            <div className={lb}>USAR TEMPLATE SALVO</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={templateSelecionadoId}
                  onChange={(e) => setTemplateSelecionadoId(e.target.value)}
                  className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[14px] outline-none ${
                    templateSelecionadoId ? "text-ink" : "text-muted"
                  }`}
                >
                  <option value="">Selecione um template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                  ▾
                </span>
              </div>
              <button
                type="button"
                onClick={carregarTemplate}
                disabled={!templateSelecionadoId}
                className="flex-none rounded-[14px] border border-primary/40 px-4 py-3 text-[13.5px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-40"
              >
                Carregar
              </button>
              {templateSelecionadoId && (
                <button
                  type="button"
                  onClick={() => excluirTemplate(templateSelecionadoId)}
                  className="flex-none rounded-[14px] border border-danger/30 px-4 py-3 text-[13.5px] font-semibold text-danger hover:bg-danger/5"
                >
                  Excluir
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11.5px] text-faint">
              Carregar substitui os padrões abaixo pelos do template selecionado.
            </p>
          </div>
        )}

        {/* Padrões */}
        <div>
          <div className="mb-3 text-[12px] font-semibold text-muted">
            PADRÕES DE EVENTO
          </div>
          <div className="flex flex-col gap-3">
            {padroes.map((padrao) => (
              <div
                key={padrao.id}
                className="rounded-[16px] border border-black/[0.07] bg-paper p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11.5px] font-semibold text-muted">
                    NOME DO EVENTO
                  </div>
                  {padroes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePadrao(padrao.id)}
                      title="Remover padrão"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-faint hover:bg-black/[0.05] hover:text-danger"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  value={padrao.nome}
                  onChange={(e) => updatePadrao(padrao.id, { nome: e.target.value })}
                  placeholder="Ex.: Missa Dominical"
                  className={`${baseInput} px-4 py-3 text-[14px]`}
                />
                <div className="mt-3 flex gap-3">
                  <div className="flex-1">
                    <div className="mb-1.5 text-[11px] font-semibold text-muted">
                      DIA DA SEMANA
                    </div>
                    <div className="relative">
                      <select
                        value={padrao.diaSemana}
                        onChange={(e) =>
                          updatePadrao(padrao.id, { diaSemana: Number(e.target.value) })
                        }
                        className="w-full appearance-none rounded-[12px] border border-black/10 bg-paper px-3 py-2.5 pr-8 text-[13.5px] text-ink outline-none"
                      >
                        {DIAS_SEMANA.map((d, i) => (
                          <option key={i} value={i}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                        ▾
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1.5 text-[11px] font-semibold text-muted">
                      HORA
                    </div>
                    <input
                      type="time"
                      value={padrao.horario}
                      onChange={(e) =>
                        updatePadrao(padrao.id, { horario: e.target.value })
                      }
                      className="w-full rounded-[12px] border border-black/10 bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPadrao}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-black/20 py-3 text-[13.5px] font-semibold text-ink-soft hover:border-black/30 hover:text-ink"
          >
            + Adicionar padrão
          </button>
        </div>

        {/* Salvar padrões como template */}
        {grupoId && (
          <div className="rounded-[14px] border border-black/[0.07] bg-paper px-4 py-3.5">
            {!mostrarSalvarTemplate ? (
              <button
                type="button"
                onClick={() => setMostrarSalvarTemplate(true)}
                disabled={!podePrevisualizar}
                className="text-[13px] font-semibold text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                title={!podePrevisualizar ? "Preencha todos os padrões antes de salvar" : undefined}
              >
                Salvar estes padrões como template →
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-[12px] font-semibold text-muted">
                  NOME DO TEMPLATE
                </div>
                <input
                  value={templateNome}
                  onChange={(e) => setTemplateNome(e.target.value)}
                  placeholder="Ex.: Padrão setembro"
                  className={`${baseInput} px-4 py-3 text-[14px]`}
                />
                {templateMensagem && (
                  <p className="text-[12.5px] text-success">{templateMensagem}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarSalvarTemplate(false);
                      setTemplateNome("");
                      setTemplateMensagem("");
                    }}
                    className="flex-1 rounded-[12px] border border-black/10 py-2.5 text-[13px] font-semibold text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvarTemplate}
                    disabled={!templateNome.trim() || salvandoTemplate}
                    className="flex-1 rounded-[12px] bg-primary py-2.5 text-[13px] font-semibold text-paper disabled:opacity-40"
                  >
                    {salvandoTemplate ? "Salvando..." : "Salvar template"}
                  </button>
                </div>
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
            onClick={irParaPreview}
            disabled={!podePrevisualizar || carregando}
            className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
          >
            {carregando ? "Verificando..." : "Pré-visualizar →"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Passo 2: Preview ────────────────────────────────────────────────── */
  const nSel = selecionados.length;
  const todosJaExistem = novos.length === 0 && previewEventos.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho do preview */}
      <div>
        <div className="text-[12px] font-semibold text-muted">
          {rotuloMesAno(mesAno)}
          {grupoNome ? ` · ${grupoNome}` : ""}
        </div>
        {todosJaExistem ? (
          <div className="mt-2 rounded-[14px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5 text-[13px] leading-relaxed text-[#92400e]">
            Todos os eventos deste padrão já foram criados. Nenhum evento novo a
            adicionar.
          </div>
        ) : (
          <div className="mt-1 text-[13px] text-ink-soft">
            {nSel} novo{nSel !== 1 ? "s" : ""} evento{nSel !== 1 ? "s" : ""} ser
            {nSel !== 1 ? "ão" : "á"} criado{nSel !== 1 ? "s" : ""}
            {jaExistentes.length > 0 &&
              ` (${jaExistentes.length} já existe${
                jaExistentes.length !== 1 ? "m" : ""
              })`}
          </div>
        )}
      </div>

      {/* Selecionar / desmarcar todos (só entre os novos) */}
      {novos.length > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleTodos(true)}
            disabled={nSel === novos.length}
            className="text-[12.5px] font-semibold text-ink-soft underline disabled:opacity-30"
          >
            Selecionar todos
          </button>
          <span className="text-[12px] text-faint">·</span>
          <button
            onClick={() => toggleTodos(false)}
            disabled={nSel === 0}
            className="text-[12.5px] font-semibold text-ink-soft underline disabled:opacity-30"
          >
            Desmarcar todos
          </button>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="flex flex-col gap-2">
        {previewEventos.map((evento) => {
          const [y, m, d] = evento.date.split("-").map(Number);
          const dia = d;
          const sem = DIAS_CURTO[new Date(y, m - 1, d).getDay()].toUpperCase();

          if (evento.jaExiste) {
            return (
              <div
                key={evento.key}
                className="flex w-full items-center gap-3 rounded-[14px] border border-black/[0.04] bg-paper px-4 py-3 opacity-50"
              >
                <div className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border-[1.5px] border-black/20" />
                <div className="w-9 flex-none text-center">
                  <div className="text-[16px] font-bold leading-none text-ink">
                    {dia}
                  </div>
                  <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-faint">
                    {sem}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink">
                    <span className="font-semibold">{evento.horario}</span> ·{" "}
                    {evento.nome}
                  </div>
                  {evento.liturgicalName && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <LiturgicalDot color={evento.liturgicalColor} />
                      {evento.liturgicalName}
                    </div>
                  )}
                </div>
                <span className="flex-none rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400e]">
                  Já existe
                </span>
              </div>
            );
          }

          return (
            <button
              key={evento.key}
              type="button"
              onClick={() => toggleEvento(evento.key)}
              className={`flex w-full items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition-opacity ${
                evento.selecionado
                  ? "border-black/[0.07] bg-paper"
                  : "border-black/[0.04] opacity-40"
              }`}
            >
              <div
                className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border-[1.5px] text-[11px] font-bold ${
                  evento.selecionado
                    ? "border-primary bg-primary text-paper"
                    : "border-black/25"
                }`}
              >
                {evento.selecionado && "✓"}
              </div>
              <div className="w-9 flex-none text-center">
                <div className="text-[16px] font-bold leading-none text-ink">
                  {dia}
                </div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-faint">
                  {sem}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] text-ink">
                  <span className="font-semibold">{evento.horario}</span> ·{" "}
                  {evento.nome}
                </div>
                {evento.liturgicalName && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    <LiturgicalDot color={evento.liturgicalColor} />
                    {evento.liturgicalName}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {erro && <p className="text-[13px] text-danger">{erro}</p>}

      <div className="mt-1.5 flex flex-col gap-2.5 md:mt-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={() => setStep("configurar")}
          disabled={carregando}
          className="rounded-2xl border border-black/10 py-4 text-[15px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3 md:text-[14px]"
        >
          ← Voltar
        </button>
        {!todosJaExistem && (
          <button
            onClick={confirmar}
            disabled={nSel === 0 || carregando}
            className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
          >
            {carregando
              ? "Criando..."
              : `Confirmar e criar ${nSel} evento${nSel !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}
