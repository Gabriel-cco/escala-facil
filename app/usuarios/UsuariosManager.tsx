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
  active: boolean;
  pendente: boolean;
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
      <span className="rounded-full bg-[#F2E7D4] px-2 py-0.5 text-[10.5px] font-semibold text-[#6B3521]">
        Admin
      </span>
    );
  if (profile === "coordinator")
    return (
      <span className="rounded-full bg-[#E3D2B6] px-2 py-0.5 text-[10.5px] font-semibold text-[#4A3A31]">
        Coordenador
      </span>
    );
  return (
    <span className="rounded-full bg-[#F2E7D4] px-2 py-0.5 text-[10.5px] font-semibold text-[#6E5A4E]">
      Membro
    </span>
  );
}

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

  const [mostrarInativos, setMostrarInativos] = useState(false);

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
  const contasFiltradas = contas.filter((c) => mostrarInativos || c.active);
  const temInativos = contas.some((c) => !c.active);

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

  // --- Remover acesso (soft delete: active=false, reversível) ---
  async function confirmarRemover() {
    if (!contaRemovendo) return;
    setProcessando(true);
    setErro("");
    const supabase = createClient();
    const { error: accErr } = await supabase
      .from("accounts")
      .update({ active: false })
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

  // --- Reativar acesso ---
  async function reativar(conta: Conta) {
    setProcessando(true);
    setErro("");
    const supabase = createClient();
    const { error: accErr } = await supabase
      .from("accounts")
      .update({ active: true })
      .eq("id", conta.id);
    setProcessando(false);
    if (accErr) {
      setErro(accErr.message);
      return;
    }
    router.refresh();
  }

  const precisaGrupo = (p: string) => p === "member" || p === "coordinator";

  return (
    <>
      {/* Contagem + adicionar (desktop) */}
      <div className="mb-3 flex items-center justify-between pt-0.5">
        <div className="text-[13px] text-muted">
          {contas.length} usuário{contas.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={abrirAdicionar}
          className="hidden flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
        >
          + Adicionar usuário
        </button>
      </div>

      {/* Botão adicionar mobile */}
      <button
        onClick={abrirAdicionar}
        className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
      >
        + Adicionar usuário
      </button>

      {/* Toggle mostrar inativos */}
      {temInativos && (
        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={() => setMostrarInativos((v) => !v)}
            className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft"
          >
            <span
              className={`relative h-[18px] w-[30px] flex-none rounded-full transition-colors ${
                mostrarInativos ? "bg-primary" : "bg-black/15"
              }`}
            >
              <span
                className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-paper transition-all ${
                  mostrarInativos ? "left-[14px]" : "left-[2px]"
                }`}
              />
            </span>
            Mostrar inativos
          </button>
        </div>
      )}

      {/* Lista */}
      {contasFiltradas.length === 0 ? (
        <p className="text-[13px] text-muted">Nenhum usuário encontrado.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {contasFiltradas.map((conta) => (
            <div
              key={conta.id}
              className={`flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-paper shadow-card px-4 py-3 ${
                !conta.active ? "opacity-55" : ""
              }`}
            >
              <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-avatar text-[14px] font-semibold text-avatar-ink">
                {iniciais(conta.userName)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink">
                    {conta.userName}
                  </span>
                  {conta.pendente && (
                    <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10.5px] font-semibold text-[#92400e]">
                      Pendente
                    </span>
                  )}
                  {!conta.active && (
                    <span className="rounded-full bg-[#e5e7eb] px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-muted">{conta.userEmail}</div>
                <div className="flex flex-wrap items-center gap-2">
                  {badgePerfil(conta.profile)}
                  {conta.groupName && (
                    <span className="text-[12px] text-muted">
                      {conta.groupName}
                    </span>
                  )}
                </div>
              </div>
              {conta.active ? (
                <div className="ml-auto flex flex-none items-center gap-1.5">
                  <button
                    onClick={() => abrirEditar(conta)}
                    className="rounded-lg border border-black/10 px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-surface"
                  >
                    Editar
                  </button>
                  {conta.id !== adminAccountId && (
                    <button
                      onClick={() => {
                        setErro("");
                        setContaRemovendo(conta);
                      }}
                      className="rounded-lg border border-danger/30 px-3 py-1.5 text-[12.5px] font-semibold text-danger hover:bg-danger/5"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => reativar(conta)}
                  disabled={processando}
                  className="ml-auto flex-none whitespace-nowrap rounded-lg border border-black/10 px-3 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-50"
                >
                  Reativar
                </button>
              )}
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
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[480px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-7">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">NOVO USUÁRIO</div>
              <h2 className="mb-5 text-[20px] font-semibold text-ink">
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
                    className="rounded-[14px] bg-primary py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
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
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[480px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-7">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">EDITAR USUÁRIO</div>
              <h2 className="mb-5 text-[20px] font-semibold text-ink">
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
                    className="rounded-[14px] bg-primary py-3.5 text-[14px] font-semibold text-paper disabled:opacity-50 md:rounded-[11px] md:px-6 md:py-3"
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
            <div className="ef-sheet mx-auto mt-auto w-full max-w-[440px] rounded-t-[26px] bg-[#ffffff] px-[18px] pb-9 pt-3.5 md:mt-0 md:max-w-[420px] md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:p-6">
              <div className="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-black/20 md:hidden" />
              <div className="mb-1 text-[12px] tracking-[0.4px] text-muted">REMOVER ACESSO</div>
              <div className="mb-2 text-[19px] font-semibold text-ink">
                Remover acesso?
              </div>
              <p className="mb-5 text-[13.5px] leading-relaxed text-[#6E5A4E]">
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
