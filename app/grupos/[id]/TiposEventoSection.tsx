"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Role = { id: string; name: string };
type EventType = { id: string; name: string; roleIds: Set<string> };

export default function TiposEventoSection({
  groupId,
  roles,
  tipos: inicial,
  podeGerenciar,
}: {
  groupId: string;
  roles: Role[];
  tipos: EventType[];
  podeGerenciar: boolean;
}) {
  const [lista, setLista] = useState<EventType[]>(inicial);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editRoleIds, setEditRoleIds] = useState<Set<string>>(new Set());
  const [novoNome, setNovoNome] = useState("");
  const [novoRoleIds, setNovoRoleIds] = useState<Set<string>>(new Set());
  const [criando, setCriando] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const router = useRouter();

  function iniciarEdicao(tipo: EventType) {
    setEditando(tipo.id);
    setEditNome(tipo.name);
    setEditRoleIds(new Set(tipo.roleIds));
    setExpandido(null);
  }

  function cancelarEdicao() {
    setEditando(null);
    setEditNome("");
    setEditRoleIds(new Set());
  }

  async function salvarEdicao(id: string) {
    const nome = editNome.trim();
    if (!nome || salvandoId) return;
    setSalvandoId(id);
    setErro("");

    const supabase = createClient();

    const { error: nameErr } = await supabase
      .from("event_types")
      .update({ name: nome })
      .eq("id", id);
    if (nameErr) {
      setErro("Erro ao salvar: " + nameErr.message);
      setSalvandoId(null);
      return;
    }

    // Reescreve as funções do tipo
    await supabase.from("event_type_roles").delete().eq("event_type_id", id);
    if (editRoleIds.size > 0) {
      await supabase.from("event_type_roles").insert(
        [...editRoleIds].map((roleId) => ({ event_type_id: id, role_id: roleId }))
      );
    }

    setLista((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: nome, roleIds: new Set(editRoleIds) } : t))
    );
    setSalvandoId(null);
    cancelarEdicao();
    router.refresh();
  }

  async function criar() {
    const nome = novoNome.trim();
    if (!nome || criando) return;
    setCriando(true);
    setErro("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("event_types")
      .insert({ group_id: groupId, name: nome })
      .select("id, name")
      .single();

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um tipo com esse nome."
          : "Erro: " + error.message
      );
      setCriando(false);
      return;
    }

    if (novoRoleIds.size > 0) {
      await supabase.from("event_type_roles").insert(
        [...novoRoleIds].map((roleId) => ({ event_type_id: data.id, role_id: roleId }))
      );
    }

    setLista((prev) =>
      [...prev, { id: data.id, name: nome, roleIds: new Set(novoRoleIds) }].sort(
        (a, b) => a.name.localeCompare(b.name, "pt-BR")
      )
    );
    setNovoNome("");
    setNovoRoleIds(new Set());
    setCriando(false);
    router.refresh();
  }

  async function excluir(id: string) {
    if (excluindo) return;
    setExcluindo(id);
    const supabase = createClient();
    await supabase.from("event_types").delete().eq("id", id);
    setLista((prev) => prev.filter((t) => t.id !== id));
    setExcluindo(null);
    setConfirmar(null);
    router.refresh();
  }

  function toggleRole(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  return (
    <section>
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
        Tipos de evento
      </div>
      <p className="mb-3 text-[12.5px] text-muted">
        Defina quais funções cada tipo de evento inclui. Ao criar um evento, o tipo pré-preenche as funções.
      </p>

      <div className="flex flex-col gap-2">
        {lista.map((tipo) => (
          <div
            key={tipo.id}
            className="rounded-[14px] border border-black/[0.06] bg-paper shadow-card"
          >
            {editando === tipo.id ? (
              <div className="flex flex-col gap-3 px-3.5 py-3">
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="rounded-[10px] border border-black/10 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => {
                    const sel = editRoleIds.has(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setEditRoleIds(toggleRole(editRoleIds, r.id))}
                        className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          sel
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-black/10 text-muted hover:bg-surface"
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => salvarEdicao(tipo.id)}
                    disabled={!editNome.trim() || salvandoId === tipo.id}
                    className="rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                  >
                    {salvandoId === tipo.id ? "..." : "Salvar"}
                  </button>
                  <button
                    onClick={cancelarEdicao}
                    className="rounded-[10px] border border-black/10 px-4 py-2 text-[13px] font-semibold text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandido(expandido === tipo.id ? null : tipo.id)}
                    className="flex flex-1 items-center gap-1.5 text-left"
                  >
                    <span className="text-[14px] font-semibold text-ink">{tipo.name}</span>
                    <span className="text-[11px] text-muted">
                      ({tipo.roleIds.size} função{tipo.roleIds.size !== 1 ? "ões" : ""})
                    </span>
                    <span className="ml-auto text-[11px] text-muted">
                      {expandido === tipo.id ? "▲" : "▼"}
                    </span>
                  </button>

                  {podeGerenciar && confirmar !== tipo.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => iniciarEdicao(tipo)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-surface hover:text-ink"
                        title="Editar tipo"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmar(tipo.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-faint hover:bg-danger/10 hover:text-danger"
                        title="Excluir tipo"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {podeGerenciar && confirmar === tipo.id && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => excluir(tipo.id)}
                        disabled={!!excluindo}
                        className="rounded-lg bg-danger px-3 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        {excluindo === tipo.id ? "..." : "Excluir"}
                      </button>
                      <button
                        onClick={() => setConfirmar(null)}
                        className="rounded-lg border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {expandido === tipo.id && tipo.roleIds.size > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roles
                      .filter((r) => tipo.roleIds.has(r.id))
                      .map((r) => (
                        <span
                          key={r.id}
                          className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[12px] text-primary"
                        >
                          {r.name}
                        </span>
                      ))}
                  </div>
                )}

                {expandido === tipo.id && tipo.roleIds.size === 0 && (
                  <p className="mt-2 text-[12px] text-muted">Nenhuma função definida.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {lista.length === 0 && (
          <p className="text-[13px] text-muted">Nenhum tipo de evento cadastrado.</p>
        )}

        {podeGerenciar && (
          <div className="mt-1 rounded-[14px] border border-dashed border-black/15 px-3.5 py-3">
            <p className="mb-2 text-[12px] font-semibold text-muted">Novo tipo</p>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") criar(); }}
              placeholder="Ex.: Missa dominical"
              className="mb-2.5 w-full rounded-[10px] border border-black/10 bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {roles.map((r) => {
                const sel = novoRoleIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setNovoRoleIds(toggleRole(novoRoleIds, r.id))}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      sel
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-black/10 text-muted hover:bg-surface"
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
            <button
              onClick={criar}
              disabled={!novoNome.trim() || criando}
              className="rounded-[10px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              {criando ? "..." : "Adicionar tipo"}
            </button>
          </div>
        )}

        {erro && <p className="text-[12.5px] text-danger">{erro}</p>}
      </div>
    </section>
  );
}
