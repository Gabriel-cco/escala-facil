"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Grupo = { id: string; name: string };

function prevMes(ano: number, mes: number): string {
  if (mes === 1) return `${ano - 1}-12`;
  return `${ano}-${String(mes - 1).padStart(2, "0")}`;
}
function nextMes(ano: number, mes: number): string {
  if (mes === 12) return `${ano + 1}-01`;
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

export default function FiltrosMes({
  ano,
  mes,
  grupos,
  grupoId,
}: {
  ano: number;
  mes: number;
  grupos: Grupo[];
  grupoId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function navegar(novoMes?: string, novoGrupo?: string) {
    const p = new URLSearchParams(params.toString());
    if (novoMes !== undefined) p.set("mes", novoMes);
    if (novoGrupo !== undefined) {
      if (novoGrupo) p.set("grupo", novoGrupo);
      else p.delete("grupo");
    }
    router.push(`/relatorio-uso?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Navegação de mês */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navegar(prevMes(ano, mes))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-surface"
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <span className="min-w-[140px] text-center text-[14px] font-semibold text-ink">
          {MESES[mes - 1]} {ano}
        </span>
        <button
          onClick={() => navegar(nextMes(ano, mes))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[16px] text-ink-soft hover:bg-surface"
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      {/* Seletor de grupo (só aparece se há mais de um grupo) */}
      {grupos.length > 1 && (
        <div className="relative">
          <select
            value={grupoId}
            onChange={(e) => navegar(undefined, e.target.value)}
            className="appearance-none rounded-[12px] border border-black/10 bg-paper pl-3.5 pr-8 py-2 text-[13px] text-ink outline-none"
          >
            <option value="">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
            ▾
          </span>
        </div>
      )}
    </div>
  );
}
