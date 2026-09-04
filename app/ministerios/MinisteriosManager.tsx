"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Ministerio = { id: string; name: string };
type MembroItem = { accountId: string; nome: string };
type DadosMinisterio = {
  membros: MembroItem[];
  candidatos: MembroItem[];
  carregando: boolean;
  candidatoSel: string;
};

const iconeLapis = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeFechar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function IconeChevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-150 ${aberto ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

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

  const [expandido, setExpandido] = useState<string | null>(null);
  const [dados, setDados] = useState<Record<string, DadosMinisterio>>({});
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const [erro, setErro] = useState("");
  const router = useRouter();

  async function carregarMembros(ministerioId: string) {
    setDados((prev) => ({
      ...prev,
      [ministerioId]: { membros: [], candidatos: [], carregando: true, candidatoSel: "" },
    }));

    const supabase = createClient();
    const [vinculadosRes, todosRes] = await Promise.all([
      supabase
        .from("ministerio_members")
        .select("account_id, account:accounts(id, user:users(name))")
        .eq("ministerio_id", ministerioId),
      supabase
        .from("accounts")
        .select("id, user:users(name)")
        .eq("group_id", groupId)
        .eq("profile", "member")
        .eq("active", true),
    ]);

    const vinculadosSet = new Set((vinculadosRes.data ?? []).map((v) => v.account_id));

    const membros: MembroItem[] = (vinculadosRes.data ?? []).map((v) => {
      const acc = Array.isArray(v.account) ? v.account[0] : v.account;
      const u = acc
        ? Array.isArray((acc as { user?: unknown }).user)
          ? ((acc as { user: unknown[] }).user)[0]
          : (acc as { user?: unknown }).user
        : null;
      return { accountId: v.account_id, nome: (u as { name?: string } | null)?.name ?? "?" };
    });

    const candidatos: MembroItem[] = (todosRes.data ?? [])
      .filter((m) => !vinculadosSet.has(m.id))
      .map((m) => {
        const u = Array.isArray(m.user) ? m.user[0] : m.user;
        return { accountId: m.id, nome: (u as { name?: string } | null)?.name ?? "?" };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    setDados((prev) => ({
      ...prev,
      [ministerioId]: {
        membros,
        candidatos,
        carregando: false,
        candidatoSel: candidatos[0]?.accountId ?? "",
      },
    }));
  }

  async function toggleExpandido(ministerioId: string) {
    if (expandido === ministerioId) {
      setExpandido(null);
      return;
    }
    setExpandido(ministerioId);
    await carregarMembros(ministerioId);
  }

  async function adicionarMembro(ministerioId: string, accountId: string) {
    if (!accountId || adicionando) return;
    setAdicionando(ministerioId);
    const supabase = createClient();
    const { error } = await supabase
      .from("ministerio_members")
      .insert({ ministerio_id: ministerioId, account_id: accountId });
    setAdicionando(null);
    if (error) {
      setErro("Erro ao adicionar: " + error.message);
      return;
    }
    await carregarMembros(ministerioId);
    router.refresh();
  }

  async function removerMembro(ministerioId: string, accountId: string) {
    if (removendo) return;
    setRemovendo(accountId);
    const supabase = createClient();
    await supabase
      .from("ministerio_members")
      .delete()
      .eq("ministerio_id", ministerioId)
      .eq("account_id", accountId);
    setRemovendo(null);
    await carregarMembros(ministerioId);
    router.refresh();
  }

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
    if (expandido === m.id) setExpandido(null);
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
    if (expandido === id) setExpandido(null);
    setExcluindo(null);
    setConfirmar(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {lista.map((m) => {
        const d = dados[m.id];
        const aberto = expandido === m.id;

        return (
          <div
            key={m.id}
            className="rounded-[14px] border border-black/[0.06] bg-paper shadow-card"
          >
            {/* Linha principal */}
            <div className="flex items-center gap-3 px-3.5 py-2.5">
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
                  <button
                    onClick={() => toggleExpandido(m.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="flex-1 text-[14px] text-ink">{m.name}</span>
                    <span className="text-faint">
                      <IconeChevron aberto={aberto} />
                    </span>
                  </button>

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
                        {iconeFechar}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Painel de membros */}
            {aberto && editando !== m.id && (
              <div className="border-t border-black/[0.06] px-3.5 pb-3 pt-2.5">
                {!d || d.carregando ? (
                  <p className="text-[12.5px] text-muted">Carregando...</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {d.membros.length === 0 && (
                      <p className="mb-1.5 text-[12.5px] text-muted">Nenhum membro vinculado.</p>
                    )}
                    {d.membros.map((mb) => (
                      <div
                        key={mb.accountId}
                        className="flex items-center justify-between rounded-[10px] px-2 py-1.5 hover:bg-surface"
                      >
                        <span className="text-[13.5px] text-ink">{mb.nome}</span>
                        <button
                          onClick={() => removerMembro(m.id, mb.accountId)}
                          disabled={removendo === mb.accountId}
                          className="text-[11.5px] font-medium text-danger disabled:opacity-50"
                        >
                          {removendo === mb.accountId ? "..." : "Remover"}
                        </button>
                      </div>
                    ))}

                    {d.candidatos.length > 0 ? (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={d.candidatoSel}
                          onChange={(e) =>
                            setDados((prev) => ({
                              ...prev,
                              [m.id]: { ...prev[m.id], candidatoSel: e.target.value },
                            }))
                          }
                          className="flex-1 rounded-[10px] border border-black/10 bg-surface px-3 py-1.5 text-[13px] text-ink outline-none"
                        >
                          {d.candidatos.map((c) => (
                            <option key={c.accountId} value={c.accountId}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => adicionarMembro(m.id, d.candidatoSel)}
                          disabled={!d.candidatoSel || adicionando === m.id}
                          className="rounded-[10px] bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-40"
                        >
                          {adicionando === m.id ? "..." : "Adicionar"}
                        </button>
                      </div>
                    ) : (
                      d.membros.length > 0 && (
                        <p className="mt-1 text-[12px] text-muted">
                          Todos os membros já estão vinculados.
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

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
