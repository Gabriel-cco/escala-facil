"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/app/components/shell/Header";

export default function EventosHeader({
  podeGerenciar,
}: {
  podeGerenciar: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Header mobile + registro do chrome do Topbar desktop */}
      <Header
        variant="root"
        title="Eventos"
        actionLabel="+ Criar evento"
        onAction={() => setAberto(true)}
      />

      {/* Trigger mobile — aparece entre o header e o conteúdo */}
      <div className="px-[18px] pt-0.5 md:hidden">
        <button
          onClick={() => setAberto(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink"
        >
          + Criar evento
        </button>
      </div>

      {/* Dialog */}
      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setAberto(false)}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
            <div className="w-full max-w-[440px] rounded-t-[26px] bg-white px-5 pb-9 pt-3.5 md:rounded-2xl md:pb-6">
              <div className="mx-auto mb-5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <p className="mb-3 px-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                O que deseja criar?
              </p>

              <Link
                href="/eventos/novo"
                onClick={() => setAberto(false)}
                className="flex w-full flex-col rounded-[16px] bg-surface px-4 py-3.5 text-left transition-colors hover:bg-black/[0.06]"
              >
                <span className="text-[15px] font-semibold text-ink">
                  + Criar evento individual
                </span>
                <span className="mt-0.5 text-[13px] text-muted">
                  Data, horário e funções específicas
                </span>
              </Link>

              {podeGerenciar && (
                <Link
                  href="/eventos/gerar"
                  onClick={() => setAberto(false)}
                  className="mt-2 flex w-full flex-col rounded-[16px] bg-surface px-4 py-3.5 text-left transition-colors hover:bg-black/[0.06]"
                >
                  <span className="text-[15px] font-semibold text-ink">
                    Gerar escala mensal
                  </span>
                  <span className="mt-0.5 text-[13px] text-muted">
                    Padrões recorrentes para o mês inteiro
                  </span>
                </Link>
              )}

              <button
                onClick={() => setAberto(false)}
                className="mt-3 w-full rounded-[16px] border border-black/10 py-3.5 text-[14.5px] font-medium text-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
