"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";

type Qualificacao = { id: string; name: string };

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function FiltroInner({
  qualificacoes,
  selecionada,
}: {
  qualificacoes: Qualificacao[];
  selecionada: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const qualSelecionada = qualificacoes.find((q) => q.id === selecionada);

  const sugestoes = texto.trim()
    ? qualificacoes.filter((q) =>
        normalizar(q.name).includes(normalizar(texto.trim()))
      )
    : [];

  function selecionar(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("qual", id);
    } else {
      params.delete("qual");
    }
    params.delete("p");
    setTexto("");
    setAberto(false);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      {qualSelecionada && (
        <button
          onClick={() => selecionar("")}
          className="flex items-center gap-1 rounded-full bg-primary py-1 pl-3 pr-2 text-[12px] font-semibold text-white"
        >
          {qualSelecionada.name}
          <span className="text-[15px] leading-none opacity-75">×</span>
        </button>
      )}

      <div className="relative">
        <input
          type="text"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          placeholder={qualSelecionada ? "Trocar tag..." : "Filtrar por tag..."}
          autoComplete="off"
          className="h-9 w-40 rounded-xl border border-black/[0.10] bg-surface px-3 text-[12.5px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {aberto && sugestoes.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-[14px] border border-black/[0.08] bg-paper shadow-lg">
            {sugestoes.map((q) => (
              <button
                key={q.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selecionar(q.id);
                }}
                className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-surface"
              >
                {q.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FiltroQualificacoes(props: {
  qualificacoes: Qualificacao[];
  selecionada: string;
}) {
  return (
    <Suspense>
      <FiltroInner {...props} />
    </Suspense>
  );
}
