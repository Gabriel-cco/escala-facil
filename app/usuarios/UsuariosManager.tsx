"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/iniciais";

type Conta = {
  id: string;
  profile: string;
  group_id: string | null;
  suspended_until: string | null;
  userName: string;
  userEmail: string;
  userId: string;
  groupName: string | null;
};

type Grupo = { id: string; name: string };

const PERFIS = [
  { value: "admin", label: "Administrador" },
  { value: "coordinator", label: "Coordenador" },
  { value: "member", label: "Membro" },
];

function badgePerfil(profile: string) {
  if (profile === "admin")
    return (
      <span className="rounded-full bg-[#e0e0ff] px-2 py-0.5 text-[10.5px] font-semibold text-[#4040c0]">
        Admin
      </span>
    );
  if (profile === "coordinator")
    return (
      <span className="rounded-full bg-[#e8e8e5] px-2 py-0.5 text-[10.5px] font-semibold text-[#3a3a38]">
        Coordenador
      </span>
    );
  return (
    <span className="rounded-full bg-[#f0f0ed] px-2 py-0.5 text-[10.5px] font-semibold text-[#6e6e6b]">
      Membro
    </span>
  );
}

const iconeLapis = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const iconeLixo = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

type ModalAdicionarState = {
  nome: string;
  email: string;
  profile: string;
  group_id: string;
};

type ModalEditarState = {
  nome: string;
  profile: string;
  group_id: string;
};

export default function UsuariosManager({
  contas,
  grupos,
  adminAccountId,
}: {
  contas: Conta[];
  grupos: Grupo[];
  adminAccountId: string;
}) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<string | null>(null);

  // Modal adicionar
  const [showAdicionar, setShowAdicionar] = useState(false);
  const [formAdicionar, setFormAdicionar] = useState<ModalAdicionarState>({
    nome: "",
    email: "",
    profile: "member",
    group_id: grupos[0]?.id ?? "",
  });

  // Modal editar
  const [contaEditando, setContaEditando] = useState<Conta | null>(null);
  const [formEditar, setFormEditar] = useState<ModalEditarState>({
    nome: "",
    profile: "member",
    group_id: "",
  });

  // Modal remover
  const [contaRemovendo, setContaRemovendo] = useState<Conta | null>(null);

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  // --- Filtro ---
  const contasFiltradas = contas.filter((c) => {
    const termo = busca.toLowerCase();
    const matchBusca =
      !termo ||
      c.userName.toLowerCase().includes(termo) ||
      c.userEmail.toLowerCase().includes(termo);
    const matchPerfil = !filtroPerfil || c.profile === filtroPerfil;
    return matchBusca && matchPerfil;
  });

  // --- Adicionar ---
  function abrirAdicionar() {
    setFormAdicionar({ nome: "", email: "", profile: "member", group_id: grupos[0]?.id ?? "" });
    setErro("");
    setShowAdicionar(true);
  }

  async function confirmarAdicionar() {
    if (!formAdicionar.nome.trim() || !formAdicionar.email.trim()) {
      setErro("Nome e e-mail são obrigatórios.");
      return;
    }
    setProcessando(true);
    setErro("");
    const supabase = createClient();

    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .insert({ name: formAdicionar.nome.trim(), email: formAdicionar.email.trim().toLowerCase() })
      .select("id")
      .single();

    if (userErr || !userRow) {
      setErro(userErr?.message ?? "Erro ao criar usuário.");
      setProcessando(false);
      return;
    }

    const groupId = ["admin", "coordinator"].includes(formAdicionar.profile) && !formAdicionar.group_id
      ? null
      : formAdicionar.group_id || null;

    const { error: accErr } = await supabase
      .from("accounts")
      .insert({
        user_id: (userRow as { id: string }).id,
        profile: formAdicionar.profile,
        group_id: groupId,
      });

    if (accErr) {
      setErro(accErr.message);
      setProcessando(false);
      return;
    }

    setProcessando(false);
    setShowAdicionar(false);
    router.refresh();
  }

  // --- Editar ---
  function abrirEditar(conta: Conta) {
    setFormEditar({
      nome: conta.userName,
      profile: conta.profile,
      group_id: conta.group_id ?? "",
    });
    setErro("");
    setContaEditando(conta);
  }

  async function confirmarEditar() {
    if (!contaEditando) return;
    if (!formEditar.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    setProcessando(true);
    setErro("");
    const supabase = createClient();

    const { error: userErr } = await supabase
      .from("users")
      .update({ name: formEditar.nome.trim() })
      .eq("id", contaEditando.userId);

    if (userErr) {
      setErro(userErr.message);
      setProcessando(false);
      return;
    }

    const groupId = formEditar.group_id || null;
    const { error: accErr } = await supabase
      .from("accounts")
      .update({ profile: formEditar.profile, group_id: groupId })
      .eq("id", contaEditando.id);

    if (accErr) {
      setErro(accErr.message);
      setProcessando(false);
      return;
    }

    setProcessando(false);
    setContaEditando(null);
    router.refresh();
  }

  // --- Remover ---
  async function confirmarRemover() {
    if (!contaRemovendo) return;
    setProcessando(true);
    setErro("");
    const supabase = createClient();
    const { error: accErr } = await supabase
      .from("accounts")
      .delete()
      .eq("id", contaRemovendo.id);
    if (accErr) {
      setErro(accErr.message);
      setProcessando(false);
      return;
    }
    setProcessando(false);
    setContaRemovendo(null);
    router.refresh();
  }

  const precisaGrupo = (p: string) => p === "member" || p === "coordinator";

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex flex-col gap-2.5 pt-0.5">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-[13px] border border-black/10 bg-paper px-4 py-2.5 text-[14px] text-ink placeholder-muted outline-none"
        />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setFiltroPerfil(null)}
            className={`flex-none rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
              !filtroPerfil
                ? "border-ink bg-ink text-paper"
                : "border-black/10 text-ink-soft"
            }`}
          >
            Todos
          </button>
          {PERFIS.map((p) => (
            <button
              key={p.value}
              onClick={() => setFiltroPerfil(filtroPerfil === p.value ? null : p.value)}
              className={`flex-none rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                filtroPerfil === p.value
                  ? "border-ink bg-ink text-paper"
                  : "border-black/10 text-ink-soft"
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Botão adicionar — desktop */}
          <button
            onClick={abrirAdicionar}
            className="ml-auto hidden flex-none rounded-full bg-ink px-4 py-1.5 text-[12.5px] font-semibold text-paper md:flex"
          >
            + Adicionar usuário
          </button>
        </div>
      </div>

      {/* Botão adicionar mobile */}
      <button
        onClick={abrirAdicionar}
        className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
      >
        + Adicionar usuário
      </button>

      {/* Lista */}
      {contasFiltradas.length === 0 ? (
        <p className="text-[13px] text-muted">Nenhum usuário encontrado.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {contasFiltradas.map((conta) => (
            <div
              key={conta.id}
              className="group flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-paper px-[15px] py-3"
            >
              <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-avatar text-[14px] font-semibold text-avatar-ink">
                {iniciais(conta.userName)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink">
                    {conta.userName}
                  </span>
                  {badgePerfil(conta.profile)}
                </div>
                <div className="text-[12px] text-muted">{conta.userEmail}</div>
                {conta.groupName && (
                  <div className="text-[12px] text-muted">{conta.groupName}</div>
                )}
              </div>
              <div className="ml-auto flex flex-none items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                <button
                  onClick={() => abrirEditar(conta)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-ink"
                  title="Editar usuário"
                >
                  {iconeLapis}
                </button>
                {conta.id !== adminAccountId && (
                  <button
                    onClick={() => { setErro(""); setContaRemovendo(conta); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-faint hover:bg-black/[0.04] hover:text-danger"
                    title="Remover acesso"
                  >
                    {iconeLixo}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Adicionar ─── */}
      {showAdicionar && (
        <>
          <div
            onClick={() => !processando && setShowAdicionar(false)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[480px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-7">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">NOVO USUÁRIO</div>
              <h2 className="mb-5 font-serif text-[20px] font-semibold text-ink">
                Adicionar usuário
              </h2>

              <div className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                  Nome
                  <input
                    type="text"
                    value={formAdicionar.nome}
                    onChange={(e) => setFormAdicionar((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome completo"
                    className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] font-normal text-ink outline-none placeholder:text-muted"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                  E-mail
                  <input
                    type="email"
                    value={formAdicionar.email}
                    onChange={(e) => setFormAdicionar((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] font-normal text-ink outline-none placeholder:text-muted"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                  Perfil
                  <select
                    value={formAdicionar.profile}
                    onChange={(e) => setFormAdicionar((f) => ({ ...f, profile: e.target.value, group_id: grupos[0]?.id ?? "" }))}
                    className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] text-ink outline-none"
                  >
                    {PERFIS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </label>

                {precisaGrupo(formAdicionar.profile) && (
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                    Grupo
                    <select
                      value={formAdicionar.group_id}
                      onChange={(e) => setFormAdicionar((f) => ({ ...f, group_id: e.target.value }))}
                      className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] text-ink outline-none"
                    >
                      <option value="">Sem grupo</option>
                      {grupos.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {erro && <p className="text-[12.5px] text-danger">{erro}</p>}

                <div className="flex flex-col gap-2.5 pt-1 md:flex-row md:justify-end">
                  <button
                    onClick={() => setShowAdicionar(false)}
                    disabled={processando}
                    className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarAdicionar}
                    disabled={processando}
                    className="rounded-[14px] bg-ink py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                  >
                    {processando ? "Adicionando…" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Modal: Editar ─── */}
      {contaEditando && (
        <>
          <div
            onClick={() => !processando && setContaEditando(null)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[480px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-7">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">EDITAR USUÁRIO</div>
              <h2 className="mb-5 font-serif text-[20px] font-semibold text-ink">
                {contaEditando.userName}
              </h2>

              <div className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                  Nome
                  <input
                    type="text"
                    value={formEditar.nome}
                    onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))}
                    className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] font-normal text-ink outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                  Perfil
                  <select
                    value={formEditar.profile}
                    onChange={(e) => setFormEditar((f) => ({ ...f, profile: e.target.value }))}
                    className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] text-ink outline-none"
                  >
                    {PERFIS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </label>

                {precisaGrupo(formEditar.profile) && (
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
                    Grupo
                    <select
                      value={formEditar.group_id}
                      onChange={(e) => setFormEditar((f) => ({ ...f, group_id: e.target.value }))}
                      className="rounded-[12px] border border-black/10 bg-paper px-3.5 py-3 text-[14px] text-ink outline-none"
                    >
                      <option value="">Sem grupo</option>
                      {grupos.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {erro && <p className="text-[12.5px] text-danger">{erro}</p>}

                <div className="flex flex-col gap-2.5 pt-1 md:flex-row md:justify-end">
                  <button
                    onClick={() => setContaEditando(null)}
                    disabled={processando}
                    className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEditar}
                    disabled={processando}
                    className="rounded-[14px] bg-ink py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                  >
                    {processando ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Modal: Remover acesso ─── */}
      {contaRemovendo && (
        <>
          <div
            onClick={() => !processando && setContaRemovendo(null)}
            className="ef-backdrop fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-6">
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#f4f4f2] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">REMOVER ACESSO</div>
              <div className="mb-2 font-serif text-[19px] font-semibold text-ink">
                Remover acesso?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#5d5d5a]">
                &ldquo;{contaRemovendo.userName}&rdquo; perderá o acesso ao sistema.
                O cadastro de usuário permanece e pode ser reativado.
              </p>
              {erro && <p className="mb-3 text-[12.5px] text-danger">{erro}</p>}
              <div className="flex flex-col gap-2.5 md:flex-row md:justify-end">
                <button
                  onClick={() => setContaRemovendo(null)}
                  disabled={processando}
                  className="rounded-[14px] border border-black/10 py-3.5 text-[14px] font-semibold text-ink disabled:opacity-50 md:rounded-[11px] md:px-5 md:py-3"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRemover}
                  disabled={processando}
                  className="rounded-[14px] bg-danger py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
                >
                  {processando ? "Removendo…" : "Remover acesso"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
