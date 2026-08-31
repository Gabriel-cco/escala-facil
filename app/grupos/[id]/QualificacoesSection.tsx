"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Qualificacao = { id: string; name: string };

export default function QualificacoesSection({
  groupId,
  qualificacoes: inicial,
  podeGerenciar,
}: {
  groupId: string;
  qualificacoes: Qualificacao[];
  podeGerenciar: boolean;
}) {
  const [lista, setLista] = useState(inicial);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function criar() {
    const nome = novoNome.trim();
    if (!nome || criando) return;
    setCriando(true);
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("qualifications")
      .insert({ group_id: groupId, name: nome })
      .select("id, name")
      .single();
    setCriando(false);
    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe uma qualificação com esse nome."
          : "Erro: " + error.message
      );
      return;
    }
    setLista((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    );
    setNovoNome("");
    router.refresh();
  }

  async function excluir(id: string) {
    if (excluindo) return;
    setExcluindo(id);
    const supabase = createClient();
    await supabase.from("qualifications").delete().eq("id", id);
    setLista((prev) => prev.filter((q) => q.id !== id));
    setExcluindo(null);
    setConfirmar(null);
    router.refresh();
  }

  return (
    <section>
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
        Qualificações
      </div>
      <div className="flex flex-col gap-2">
        {lista.map((q) => (
          <div
            key={q.id}
            className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper shadow-card px-3.5 py-2.5"
          >
            <span className="flex-1 text-[14px] text-ink">{q.name}</span>
            {podeGerenciar &&
              (confirmar === q.id ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => excluir(q.id)}
                    disabled={!!excluindo}
                    className="rounded-lg bg-danger px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {excluindo === q.id ? "..." : "Excluir"}
                  </button>
                  <button
                    onClick={() => setConfirmar(null)}
                    className="rounded-lg border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmar(q.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-danger/10 hover:text-danger"
                  title="Excluir qualificação"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ))}
          </div>
        ))}
        {lista.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhuma qualificação cadastrada.
          </p>
        )}
        {podeGerenciar && (
          <div className="mt-0.5 flex gap-2">
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") criar();
              }}
              placeholder="Nova qualificação (ex.: Acólito)"
              className="flex-1 rounded-[12px] border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none"
            />
            <button
              onClick={criar}
              disabled={!novoNome.trim() || criando}
              className="rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {criando ? "..." : "Adicionar"}
            </button>
          </div>
        )}
        {erro && <p className="text-[12.5px] text-danger">{erro}</p>}
      </div>
    </section>
  );
}
