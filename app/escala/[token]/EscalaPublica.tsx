"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { liturgicalEmoji } from "../../components/LiturgicalDot";
import { logPublicScheduleView } from "@/lib/access-log";

type Assignment = { role_name: string; member_name: string };
type EventoPublico = {
  event_id: string;
  event_name: string;
  date: string;
  time: string;
  liturgical_name: string | null;
  liturgical_color: string | null;
  assignments: Assignment[] | null;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
];

function prevMes(ano: number, mes: number): string {
  if (mes === 1) return `${ano - 1}-12`;
  return `${ano}-${String(mes - 1).padStart(2, "0")}`;
}
function nextMes(ano: number, mes: number): string {
  if (mes === 12) return `${ano + 1}-01`;
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

function formatarData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS[date.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export default function EscalaPublica({
  token,
  groupName,
  groupId,
  eventos,
  ano,
  mesNum,
}: {
  token: string;
  groupName: string;
  groupId: string | null;
  eventos: EventoPublico[];
  ano: number;
  mesNum: number;
}) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (groupId) logPublicScheduleView(groupId);
  }, [groupId]);
  const termo = busca.trim().toLowerCase();

  // Próximo evento (o mais iminente a partir de hoje).
  const hoje = new Date().toISOString().split("T")[0];
  const proximoId = useMemo(() => {
    const futuros = eventos.filter((e) => e.date >= hoje);
    return futuros.length > 0 ? futuros[0].event_id : null;
  }, [eventos, hoje]);

  function eventoTemNome(e: EventoPublico): boolean {
    if (!termo) return false;
    return (e.assignments ?? []).some((a) =>
      a.member_name?.toLowerCase().includes(termo)
    );
  }

  return (
    <main className="min-h-dvh bg-screen">
      <div className="mx-auto flex w-full max-w-[560px] flex-col px-[18px] pb-16 pt-8 md:pt-12">
        {/* Header */}
        <div className="text-[12px] font-semibold uppercase tracking-[1.4px] text-faint">
          Escala Fácil
        </div>
        <h1 className="mt-1.5 font-serif text-[27px] font-semibold leading-tight text-ink">
          Escala — {groupName}
        </h1>

        {/* Busca por nome */}
        <div className="mt-5">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Encontre seu nome…"
            className="w-full rounded-[13px] border border-black/10 bg-paper px-4 py-3 text-[14px] text-ink placeholder-muted outline-none"
          />
        </div>

        {/* Navegação entre meses */}
        <div className="mt-5 flex items-center justify-between">
          <Link
            href={`/escala/${token}?mes=${prevMes(ano, mesNum)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
            aria-label="Mês anterior"
          >
            ‹
          </Link>
          <span className="text-[15px] font-semibold text-ink">
            {MESES[mesNum - 1]} {ano}
          </span>
          <Link
            href={`/escala/${token}?mes=${nextMes(ano, mesNum)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[18px] text-ink-soft hover:bg-black/[0.04]"
            aria-label="Próximo mês"
          >
            ›
          </Link>
        </div>

        {/* Lista de eventos */}
        {eventos.length === 0 ? (
          <p className="mt-8 text-center text-[13.5px] text-muted">
            Nenhum evento agendado para {MESES[mesNum - 1].toLowerCase()} de {ano}.
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {eventos.map((evento) => {
              const ehProximo = evento.event_id === proximoId;
              const destacado = eventoTemNome(evento);
              const assignments = evento.assignments ?? [];

              return (
                <div
                  key={evento.event_id}
                  className={`rounded-[18px] border bg-paper px-[18px] py-4 transition-colors ${
                    destacado
                      ? "border-[#6B3521] ring-1 ring-[#6B3521]/40"
                      : ehProximo
                      ? "border-[#c9b98a]"
                      : "border-black/[0.06]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-serif text-[17px] font-semibold leading-tight text-ink">
                        {evento.event_name}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {formatarData(evento.date)} · {evento.time.slice(0, 5)}
                      </div>
                      {evento.liturgical_name && (
                        <div className="mt-0.5 text-[12px] text-muted">
                          {liturgicalEmoji(evento.liturgical_color)}{" "}
                          {evento.liturgical_name}
                        </div>
                      )}
                    </div>
                    {ehProximo && (
                      <span className="flex-none rounded-full bg-[#efe6cc] px-2.5 py-1 text-[11px] font-semibold text-[#7a6420]">
                        Próximo
                      </span>
                    )}
                  </div>

                  {assignments.length === 0 ? (
                    <p className="text-[12.5px] text-faint">
                      Nenhuma função definida ainda.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
                      {assignments.map((a, i) => {
                        const nomeDestacado =
                          termo && a.member_name?.toLowerCase().includes(termo);
                        return (
                          <div
                            key={i}
                            className="flex items-baseline justify-between gap-3 text-[13.5px]"
                          >
                            <span className="text-muted">{a.role_name}</span>
                            <span
                              className={`text-right ${
                                nomeDestacado
                                  ? "rounded-md bg-[#F2E7D4] px-1.5 font-semibold text-[#6B3521]"
                                  : "font-medium text-ink"
                              }`}
                            >
                              {a.member_name ?? "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-[11.5px] text-faint">
          Escala pública · somente leitura
        </p>
      </div>
    </main>
  );
}
