"use client";

// TEMPORÁRIO: este componente só é renderizado para gabrielbatista1551@gmail.com.
// Revisitar quando decidirmos como abrir gestão de ministérios para outros coordenadores.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Ministerio = { id: string; name: string };

export default function MinisteriosManager({
  groupId,
  ministerios: inicial,
}: {
  groupId: string;
  ministerios: Ministerio[];
}) {
  const [lista, setLista] = useState(inicial);
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);

  const [editando, setEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const [erro, setErro] = useState("");
  const router = useRouter();

  async function criar() {
    const nome = novoNome.trim();
    if (!nome || criando) return;
    setCriando(true);
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ministerios")
      .insert({ group_id: groupId, name: nome })
      .select("id, name")
      .single();
    setCriando(false);
    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um ministério com esse nome."
          : "Erro: " + error.message
      );
      return;
    }
    setLista((prev) =>
      [...prev, data as Ministerio].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      )
    );
    setNovoNome("");
    router.refresh();
  }

  function iniciarEdicao(m: Ministerio) {
    setEditando(m.id);
    setEditNome(m.name);
    setErro("");
  }

  async function salvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome || salvandoEdit) return;
    setSalvandoEdit(true);
    setErro("");
    const supabase = createClient();
    const { error } = await supabase
      .from("ministerios")
      .update({ name: nome })
      .eq("id", id);
    setSalvandoEdit(false);
    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um ministério com esse nome."
          : "Erro: " + error.message
      );
      return;
    }
    setLista((prev) =>
      prev
        .map((m) => (m.id === id ? { ...m, name: nome } : m))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    );
    setEditando(null);
    router.refresh();
  }

  async function excluir(id: string) {
    if (excluindo) return;
    setExcluindo(id);
    const supabase = createClient();
    await supabase.from("ministerios").delete().eq("id", id);
    setLista((prev) => prev.filter((m) => m.id !== id));
    setExcluindo(null);
    setConfirmar(null);
    router.refresh();
  }

  const iconeLapis = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  return (
    <div className="flex flex-col gap-2">
      {lista.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-[14px] border border-black/[0.06] bg-paper px-3.5 py-2.5 shadow-card"
        >
          {editando === m.id ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") salvarEdicao(m.id);
                  if (e.key === "Escape") setEditando(null);
                }}
                className="flex-1 rounded-[10px] border border-black/10 bg-surface px-3 py-1.5 text-[14px] text-ink outline-none"
                autoFocus
              />
              <button
                onClick={() => salvarEdicao(m.id)}
                disabled={!editNome.trim() || salvandoEdit}
                className="rounded-lg bg-primary px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {salvandoEdit ? "..." : "Salvar"}
              </button>
              <button
                onClick={() => setEditando(null)}
                className="rounded-lg border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-[14px] text-ink">{m.name}</span>
              {confirmar === m.id ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => excluir(m.id)}
                    disabled={!!excluindo}
                    className="rounded-lg bg-danger px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {excluindo === m.id ? "..." : "Excluir"}
                  </button>
                  <button
                    onClick={() => setConfirmar(null)}
                    className="rounded-lg border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => iniciarEdicao(m)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                    title="Renomear"
                  >
                    {iconeLapis}
                  </button>
                  <button
                    onClick={() => setConfirmar(m.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-danger/10 hover:text-danger"
                    title="Excluir ministério"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {lista.length === 0 && (
        <p className="text-[13px] text-muted">Nenhum ministério cadastrado ainda.</p>
      )}

      <div className="mt-0.5 flex gap-2">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") criar();
          }}
          placeholder="Novo ministério (ex.: Ministério da Manhã)"
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

      {erro && <p className="mt-0.5 text-[12.5px] text-danger">{erro}</p>}
    </div>
  );
}
