"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentAccount } from "@/hooks/useCurrentAccount";

const DIAS_SEMANA = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MESES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

type Grupo = { id: string; name: string };
type Padrao = { id: string; nome: string; diaSemana: number; horario: string };
type EventoPreview = {
  key: string;
  nome: string;
  date: string;
  horario: string;
  grupoId: string;
  selecionado: boolean;
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

function formatarData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_CURTO[date.getDay()]}, ${d} ${MESES_CURTO[m - 1]}`;
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
}: {
  perfil: string;
  grupos: Grupo[];
  grupoIdInicial: string | null;
}) {
  const [step, setStep] = useState<"configurar" | "preview">("configurar");
  const [mesAno, setMesAno] = useState(proxMes);
  const [grupoId, setGrupoId] = useState(
    grupoIdInicial ?? (grupos.length === 1 ? grupos[0].id : "")
  );
  const [padroes, setPadroes] = useState<Padrao[]>([novoPadrao()]);
  const [previewEventos, setPreviewEventos] = useState<EventoPreview[]>([]);
  const [avisoDuplicata, setAvisoDuplicata] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const { data: contaAtual } = useCurrentAccount();
  const router = useRouter();

  const grupoFixo = perfil === "coordinator";
  const grupoNome = grupos.find((g) => g.id === grupoId)?.name ?? "";

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
    setAvisoDuplicata(null);
    setErro("");
    setCarregando(true);

    const [ano, mes] = mesAno.split("-").map(Number);
    const supabase = createClient();

    const { data: duplicata } = await supabase
      .from("generated_months")
      .select("id")
      .eq("group_id", grupoId)
      .eq("year", ano)
      .eq("month", mes)
      .maybeSingle();

    setCarregando(false);

    if (duplicata) {
      setAvisoDuplicata(
        `Este mês já foi gerado para o grupo "${grupoNome}". Acesse a lista de eventos para gerenciar os eventos existentes.`
      );
      return;
    }

    const eventos: EventoPreview[] = [];
    for (const padrao of padroes) {
      for (const date of getDatesForWeekday(ano, mes, padrao.diaSemana)) {
        eventos.push({
          key: `${padrao.id}-${date}`,
          nome: padrao.nome.trim(),
          date,
          horario: padrao.horario,
          grupoId,
          selecionado: true,
        });
      }
    }
    eventos.sort((a, b) =>
      `${a.date}${a.horario}`.localeCompare(`${b.date}${b.horario}`)
    );
    setPreviewEventos(eventos);
    setStep("preview");
  }

  function toggleEvento(key: string) {
    setPreviewEventos((prev) =>
      prev.map((e) => (e.key === key ? { ...e, selecionado: !e.selecionado } : e))
    );
  }

  function toggleTodos(selecionar: boolean) {
    setPreviewEventos((prev) => prev.map((e) => ({ ...e, selecionado: selecionar })));
  }

  const selecionados = previewEventos.filter((e) => e.selecionado);

  async function confirmar() {
    if (selecionados.length === 0 || carregando) return;
    setCarregando(true);
    setErro("");

    const [ano, mes] = mesAno.split("-").map(Number);
    const supabase = createClient();

    const { error: erroInsert } = await supabase.from("events").insert(
      selecionados.map((e) => ({
        name: e.nome,
        date: e.date,
        time: `${e.horario}:00`,
        group_id: e.grupoId,
      }))
    );

    if (erroInsert) {
      setErro("Erro ao criar eventos: " + erroInsert.message);
      setCarregando(false);
      return;
    }

    await supabase.from("generated_months").insert({
      group_id: grupoId,
      year: ano,
      month: mes,
      generated_by: contaAtual?.account.id ?? null,
    });

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

        {/* Aviso de mês já gerado */}
        {avisoDuplicata && (
          <div className="rounded-[14px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5 text-[13px] leading-relaxed text-[#92400e]">
            {avisoDuplicata}{" "}
            <Link
              href={grupoId ? `/eventos?grupo=${grupoId}` : "/eventos"}
              className="font-semibold underline"
            >
              Ver eventos
            </Link>
          </div>
        )}

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
            className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
          >
            {carregando ? "Verificando..." : "Pré-visualizar →"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Passo 2: Preview ────────────────────────────────────────────────── */
  const total = previewEventos.length;
  const nSel = selecionados.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho do preview */}
      <div>
        <div className="text-[12px] font-semibold text-muted">
          {rotuloMesAno(mesAno)}
          {grupoNome ? ` · ${grupoNome}` : ""}
        </div>
        <div className="mt-1 text-[13px] text-ink-soft">
          {nSel === total
            ? `${total} evento${total !== 1 ? "s" : ""} selecionado${total !== 1 ? "s" : ""}`
            : `${nSel} de ${total} evento${total !== 1 ? "s" : ""} selecionado${nSel !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Selecionar / desmarcar todos */}
      {total > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleTodos(true)}
            disabled={nSel === total}
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
        {previewEventos.map((evento) => (
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
                  ? "border-ink bg-ink text-paper"
                  : "border-black/25"
              }`}
            >
              {evento.selecionado && "✓"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-ink">{evento.nome}</div>
              <div className="mt-0.5 text-[12px] text-muted">
                {formatarData(evento.date)} · {evento.horario}
              </div>
            </div>
          </button>
        ))}
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
        <button
          onClick={confirmar}
          disabled={nSel === 0 || carregando}
          className="w-full rounded-2xl bg-ink py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {carregando
            ? "Criando..."
            : `Confirmar e criar ${nSel} evento${nSel !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
