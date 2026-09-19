"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Qualificacao = { id: string; name: string };

function ChipsInner({ qualificacoes, selecionada }: { qualificacoes: Qualificacao[]; selecionada: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selecionar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("qual", id);
    } else {
      params.delete("qual");
    }
    params.delete("p");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-[12px] font-semibold whitespace-nowrap transition-colors ${
      ativo
        ? "bg-primary text-white"
        : "border border-black/10 bg-surface text-ink-soft hover:bg-black/[0.05]"
    }`;

  return (
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => selecionar("")} className={chip(!selecionada)}>
        Todos
      </button>
      {qualificacoes.map((q) => (
        <button
          key={q.id}
          onClick={() => selecionar(selecionada === q.id ? "" : q.id)}
          className={chip(selecionada === q.id)}
        >
          {q.name}
        </button>
      ))}
    </div>
  );
}

export function FiltroQualificacoes(props: { qualificacoes: Qualificacao[]; selecionada: string }) {
  return (
    <Suspense>
      <ChipsInner {...props} />
    </Suspense>
  );
}
