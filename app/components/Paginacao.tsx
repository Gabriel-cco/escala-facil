"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BaseProps = {
  paginaAtual: number;
  totalItens: number;
  itensPorPagina: number;
  sufixo?: string;
};

function NavPaginas({
  paginaAtual,
  totalPaginas,
  totalItens,
  itensPorPagina,
  sufixo,
  irPara,
}: {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  sufixo?: string;
  irPara: (p: number) => void;
}) {
  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

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

  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-colors";

  return (
    <div className="border-t border-black/[0.06]">
      {/* Desktop */}
      <div className="hidden items-center justify-between px-5 py-3 md:flex">
        <span className="text-[13px] text-muted">
          Mostrando {inicio}–{fim} de {totalItens}
          {sufixo ? ` ${sufixo}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => irPara(paginaAtual - 1)}
            disabled={paginaAtual === 1}
            className={`${btn} border border-black/10 bg-paper text-ink disabled:pointer-events-none disabled:opacity-30`}
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
                onClick={() => irPara(n as number)}
                className={`${btn} ${
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
            className={`${btn} border border-black/10 bg-paper text-ink disabled:pointer-events-none disabled:opacity-30`}
            aria-label="Próxima página"
          >
            ›
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex items-center justify-between md:hidden">
        <button
          onClick={() => irPara(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          className="flex h-12 w-14 items-center justify-center text-[22px] text-ink-soft disabled:opacity-30"
          aria-label="Página anterior"
        >
          ‹
        </button>
        <span className="text-[13px] font-medium text-ink">
          Página {paginaAtual} de {totalPaginas}
        </span>
        <button
          onClick={() => irPara(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          className="flex h-12 w-14 items-center justify-center text-[22px] text-ink-soft disabled:opacity-30"
          aria-label="Próxima página"
        >
          ›
        </button>
      </div>
    </div>
  );
}

function PaginacaoInner({ paginaAtual, totalItens, itensPorPagina, sufixo }: BaseProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  if (totalItens === 0 || totalPaginas <= 1) return null;

  function irPara(pagina: number) {
    if (pagina < 1 || pagina > totalPaginas) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", String(pagina));
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <NavPaginas
      paginaAtual={paginaAtual}
      totalPaginas={totalPaginas}
      totalItens={totalItens}
      itensPorPagina={itensPorPagina}
      sufixo={sufixo}
      irPara={irPara}
    />
  );
}

/** Paginação server-side: usa URL params (?p=N). Requer Suspense internamente. */
export function Paginacao(props: BaseProps) {
  return (
    <Suspense>
      <PaginacaoInner {...props} />
    </Suspense>
  );
}

/** Paginação client-side: chama onMudar(página) em vez de atualizar a URL. */
export function PaginacaoCliente({
  paginaAtual,
  totalItens,
  itensPorPagina,
  sufixo,
  onMudar,
}: BaseProps & { onMudar: (p: number) => void }) {
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  if (totalItens === 0 || totalPaginas <= 1) return null;

  return (
    <NavPaginas
      paginaAtual={paginaAtual}
      totalPaginas={totalPaginas}
      totalItens={totalItens}
      itensPorPagina={itensPorPagina}
      sufixo={sufixo}
      irPara={(p) => {
        if (p >= 1 && p <= totalPaginas) onMudar(p);
      }}
    />
  );
}
