"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PaginacaoProps = {
  paginaAtual: number;
  totalItens: number;
  itensPorPagina: number;
};

function PaginacaoInner({ paginaAtual, totalItens, itensPorPagina }: PaginacaoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  if (totalItens === 0 || totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

  function irPara(pagina: number) {
    if (pagina < 1 || pagina > totalPaginas) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", String(pagina));
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function mudarPP(pp: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pp", String(pp));
    params.set("p", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function gerarNumeracao(): (number | "…")[] {
    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }
    const result: (number | "…")[] = [];
    let prev: number | null = null;
    for (let i = 1; i <= totalPaginas; i++) {
      const mostrar =
        i === 1 ||
        i === totalPaginas ||
        (i >= paginaAtual - 1 && i <= paginaAtual + 1);
      if (mostrar) {
        if (prev !== null && i - prev > 1) result.push("…");
        result.push(i);
        prev = i;
      }
    }
    return result;
  }

  const btnBase =
    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-colors";

  return (
    <div className="flex flex-col items-center gap-3 pt-1 md:flex-row md:justify-between">
      {/* Itens por página */}
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <div className="relative">
          <select
            value={itensPorPagina}
            onChange={(e) => mudarPP(Number(e.target.value))}
            className="appearance-none rounded-[10px] border border-black/10 bg-paper py-1.5 pl-3 pr-7 text-[13px] text-ink outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
            ▾
          </span>
        </div>
        <span>por página</span>
      </div>

      {/* Números */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => irPara(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          className={`${btnBase} border border-black/10 bg-paper text-ink disabled:pointer-events-none disabled:opacity-30`}
          aria-label="Página anterior"
        >
          ‹
        </button>
        {gerarNumeracao().map((n, i) =>
          n === "…" ? (
            <span
              key={`e-${i}`}
              className="flex h-8 w-8 items-center justify-center text-[13px] text-faint"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => irPara(n)}
              className={`${btnBase} ${
                n === paginaAtual
                  ? "bg-primary text-white"
                  : "border border-black/10 bg-paper text-ink hover:bg-surface"
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          onClick={() => irPara(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          className={`${btnBase} border border-black/10 bg-paper text-ink disabled:pointer-events-none disabled:opacity-30`}
          aria-label="Próxima página"
        >
          ›
        </button>
      </div>

      {/* Contagem */}
      <span className="text-[13px] text-muted">
        {inicio}–{fim} de {totalItens}
      </span>
    </div>
  );
}

export function Paginacao(props: PaginacaoProps) {
  return (
    <Suspense>
      <PaginacaoInner {...props} />
    </Suspense>
  );
}
