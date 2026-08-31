"use client";

import { useState } from "react";
import { liturgicalEmoji } from "@/app/components/LiturgicalDot";
import AtribuicoesManager from "./AtribuicoesManager";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatarData(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS[date.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export type AtribuicaoLeitura = {
  roleId: string;
  roleName: string;
  memberName: string | null;
};

type Funcao = { id: string; nome: string; assignmentType: "pessoa" | "ministerio" };
type Membro = { id: string; nome: string; iniciais: string };
type Ministerio = { id: string; name: string };
type AtribuicaoEdicao = {
  roleId: string;
  assignmentId: string | null;
  accountId: string | null;
  accountName: string | null;
  ministerioId: string | null;
  ministerioName: string | null;
  suspendedNaData: boolean;
  pendingSwapId: string | null;
  pendingSwapRequesterId: string | null;
};

export default function EscalaEventoView({
  eventId,
  eventDate,
  groupId,
  eventName,
  grupoNome,
  dataLabel,
  horaLabel,
  liturgicalName,
  liturgicalColor,
  ministerioNome,
  podeGerenciar,
  currentAccountId,
  atribuicoesLeitura,
  funcoes,
  membros,
  ministerios = [],
  membrosElegiveisPorFuncao = {},
  atribuicoesEdicao,
}: {
  eventId: string;
  eventDate: string;
  groupId: string;
  eventName: string;
  grupoNome: string;
  dataLabel: string;
  horaLabel: string;
  liturgicalName: string | null;
  liturgicalColor: string | null;
  ministerioNome?: string | null;
  podeGerenciar: boolean;
  currentAccountId: string | null;
  atribuicoesLeitura: AtribuicaoLeitura[];
  funcoes: Funcao[];
  membros: Membro[];
  ministerios?: Ministerio[];
  membrosElegiveisPorFuncao?: Record<string, string[]>;
  atribuicoesEdicao: AtribuicaoEdicao[];
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:gap-[22px]">
        <button
          onClick={() => setEditando(false)}
          className="self-start text-[13px] font-semibold text-ink-soft hover:text-ink"
        >
          ← Voltar para visualização
        </button>
        <AtribuicoesManager
          eventId={eventId}
          eventDate={eventDate}
          groupId={groupId}
          grupoNome={grupoNome}
          dataLabel={dataLabel}
          horaLabel={horaLabel}
          liturgicalName={liturgicalName}
          liturgicalColor={liturgicalColor}
          currentAccountId={currentAccountId}
          funcoes={funcoes}
          membros={membros}
          ministerios={ministerios}
          membrosElegiveisPorFuncao={membrosElegiveisPorFuncao}
          atribuicoes={atribuicoesEdicao}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[18px] border border-[#c9b98a] bg-paper px-[18px] py-4">
        <div className="mb-3">
          <div className="font-serif text-[18px] font-semibold leading-tight text-ink">
            {eventName}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {formatarData(eventDate)} · {horaLabel}
          </div>
          {liturgicalName && (
            <div className="mt-0.5 text-[12px] text-muted">
              {liturgicalEmoji(liturgicalColor)} {liturgicalName}
            </div>
          )}
          {ministerioNome && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-surface px-2.5 py-0.5 text-[12px] font-medium text-ink-soft">
              ♪ {ministerioNome}
            </div>
          )}
          <div className="mt-0.5 text-[12px] text-faint">{grupoNome}</div>
        </div>

        {atribuicoesLeitura.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
            {atribuicoesLeitura.map((a) => (
              <div
                key={a.roleId}
                className="flex items-baseline justify-between gap-3 text-[13.5px]"
              >
                <span className="text-muted">{a.roleName}</span>
                <span className="text-right font-medium text-ink">
                  {a.memberName ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
        {atribuicoesLeitura.length === 0 && !ministerioNome && (
          <p className="text-[12.5px] text-faint">Nenhuma função definida ainda.</p>
        )}
      </div>

      {podeGerenciar && (
        <button
          onClick={() => setEditando(true)}
          className="self-start rounded-[12px] border border-primary/40 px-5 py-2.5 text-[14px] font-semibold text-primary hover:bg-primary/5"
        >
          Editar Escala
        </button>
      )}
    </div>
  );
}
