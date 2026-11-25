"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function MembroSelect({
  membros,
  membroId,
}: {
  membros: { id: string; nome: string }[];
  membroId: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = membros.find((m) => m.id === membroId);
  const filtrados = membros.filter((m) =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function mudar(id: string) {
    const p = new URLSearchParams(sp.toString());
    if (id) p.set("membro", id);
    else p.delete("membro");
    const qs = p.toString();
    router.push(qs ? `/eventos?${qs}` : "/eventos", { scroll: false });
    setOpen(false);
    setBusca("");
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-black/10 bg-paper px-3.5 py-1.5 text-[13px] font-medium text-ink-soft focus:outline-none"
      >
        {selecionado ? selecionado.nome : "Todos os membros"}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-black/10 bg-paper shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar membro..."
              className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto pb-1">
            <li>
              <button
                type="button"
                onClick={() => mudar("")}
                className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-black/5 ${!membroId ? "font-semibold text-ink" : "text-ink-soft"}`}
              >
                Todos os membros
              </button>
            </li>
            {filtrados.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-ink-soft/60">
                Nenhum membro encontrado
              </li>
            ) : (
              filtrados.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => mudar(m.id)}
                    className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-black/5 ${membroId === m.id ? "font-semibold text-ink" : "text-ink-soft"}`}
                  >
                    {m.nome}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
