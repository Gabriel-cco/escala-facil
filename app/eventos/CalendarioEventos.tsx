"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { rotuloHora } from "@/lib/datas";
import DeleteEventoButton from "./DeleteEventoButton";

export type EventoCal = {
  id: string;
  titulo: string;
  dataHora: string;
  grupoNome: string;
  atribuidas: number;
  total: number;
};

const MESES_LONGOS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarioEventos({
  eventos,
}: {
  eventos: EventoCal[];
}) {
  const hoje = new Date();
  const chaveHoje = chaveDia(hoje);

  // Mês visível (ano/mês 0-based) e dia selecionado — estado local.
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState(chaveHoje);

  // Eventos indexados por dia (data local).
  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCal[]>();
    eventos.forEach((e) => {
      const d = new Date(e.dataHora);
      if (Number.isNaN(d.getTime())) return;
      const k = chaveDia(d);
      const lista = mapa.get(k) ?? [];
      lista.push(e);
      mapa.set(k, lista);
    });
    return mapa;
  }, [eventos]);

  // Grade do mês (semanas começando no domingo).
  const celulas = useMemo(() => {
    const primeiro = new Date(ano, mes, 1);
    const offset = primeiro.getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const total = Math.ceil((offset + diasNoMes) / 7) * 7;
    const inicio = new Date(ano, mes, 1 - offset);
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [ano, mes]);

  function irMes(delta: number) {
    const novo = new Date(ano, mes + delta, 1);
    setAno(novo.getFullYear());
    setMes(novo.getMonth());
  }

  const eventosDoDia = porDia.get(diaSelecionado) ?? [];
  const [dY, dM, dD] = diaSelecionado.split("-").map(Number);
  const dataSelecionada = new Date(dY, dM - 1, dD);
  const rotuloDiaSelecionado = dataSelecionada.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Cabeçalho: navegação de mês */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => irMes(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
        >
          ‹
        </button>
        <div className="font-serif text-[19px] font-semibold text-ink md:text-[21px]">
          {MESES_LONGOS[mes]} {ano}
        </div>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => irMes(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
        >
          ›
        </button>
      </div>

      {/* Grade do calendário */}
      <div className="rounded-[18px] border border-black/[0.06] bg-paper p-3 md:p-4">
        <div className="mb-1 grid grid-cols-7">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.5px] text-faint"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celulas.map((d) => {
            const k = chaveDia(d);
            const noMes = d.getMonth() === mes;
            const ehHoje = k === chaveHoje;
            const selecionado = k === diaSelecionado;
            const temEventos = porDia.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDiaSelecionado(k)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-[11px] text-[13.5px] transition-colors ${
                  selecionado
                    ? "bg-ink font-semibold text-paper"
                    : ehHoje
                    ? "border border-ink/30 font-semibold text-ink"
                    : "hover:bg-black/[0.04]"
                } ${
                  noMes
                    ? selecionado
                      ? ""
                      : "text-ink"
                    : selecionado
                    ? "text-paper/60"
                    : "text-faint"
                }`}
              >
                {d.getDate()}
                {temEventos && (
                  <span
                    className={`absolute bottom-[5px] h-1 w-1 rounded-full ${
                      selecionado ? "bg-paper" : "bg-ink"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia selecionado */}
      <div className="flex flex-col gap-2.5">
        <div className="px-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint md:px-0">
          {rotuloDiaSelecionado}
        </div>

        {eventosDoDia.length === 0 && (
          <p className="text-[13px] text-muted">Nenhum evento neste dia.</p>
        )}

        {eventosDoDia.map((e) => (
          <div
            key={e.id}
            className="flex items-stretch rounded-[14px] border border-black/[0.06] bg-paper"
          >
            <Link
              href={`/eventos/${e.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2"
            >
              <div className="w-[46px] flex-none text-[13px] font-semibold text-ink-soft">
                {rotuloHora(e.dataHora)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-[16px] font-semibold text-ink">
                  {e.titulo}
                </div>
                <div className="text-[12px] text-muted">
                  {e.grupoNome} · {e.atribuidas}/{e.total}
                </div>
              </div>
            </Link>
            <div className="flex flex-none items-center pr-2">
              <DeleteEventoButton eventId={e.id} titulo={e.titulo} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
