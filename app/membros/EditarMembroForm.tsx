"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Qualificacao = { id: string; name: string };

const PERFIS = [
  { value: "member", label: "Membro" },
  { value: "coordinator", label: "Coordenador" },
  { value: "admin", label: "Administrador" },
];

export default function EditarMembroForm({
  accountId,
  userId,
  nomeInicial,
  emailInicial,
  cpfInicial,
  birthDateInicial,
  grupoIdInicial,
  perfilInicial,
  grupos,
  isAdmin,
  currentAccountId,
  qualificacoes = [],
  qualificacoesAtuais = [],
  ministeriosDele = [],
}: {
  accountId: string;
  userId: string;
  nomeInicial: string;
  emailInicial: string;
  cpfInicial: string;
  birthDateInicial: string;
  grupoIdInicial: string;
  perfilInicial: string;
  grupos: Grupo[];
  isAdmin: boolean;
  currentAccountId?: string;
  qualificacoes?: Qualificacao[];
  qualificacoesAtuais?: string[];
  ministeriosDele?: string[];
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [cpf, setCpf] = useState(cpfInicial);
  const [birthDate, setBirthDate] = useState(birthDateInicial);
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [profile, setProfile] = useState(perfilInicial);
  const [qualificacoesSel, setQualificacoesSel] = useState<string[]>(qualificacoesAtuais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const ehContaPropria = accountId === currentAccountId;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const precisaGrupo = isAdmin && profile !== "admin";
  const podeSalvar =
    nome.trim().length > 0 &&
    emailValido &&
    (!precisaGrupo || grupoId !== "");

  function toggleQualificacao(id: string) {
    setQualificacoesSel((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  }

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);
    const supabase = createClient();

    const { error: erroUser } = await supabase
      .from("users")
      .update({
        name: nome.trim(),
        email: email.trim(),
        cpf: cpf.trim() || null,
        birth_date: birthDate || null,
      })
      .eq("id", userId);

    if (erroUser) {
      setSalvando(false);
      setErro("Erro ao salvar: " + erroUser.message);
      return;
    }

    if (isAdmin) {
      const groupId = precisaGrupo ? (grupoId || null) : null;
      const newProfile = ehContaPropria ? perfilInicial : profile;
      const { error: erroAccount } = await supabase
        .from("accounts")
        .update({ profile: newProfile, group_id: groupId })
        .eq("id", accountId);

      if (erroAccount) {
        setSalvando(false);
        setErro("Erro ao atualizar: " + erroAccount.message);
        return;
      }
    }

    // Sincronizar qualificações via RPC (delete + insert em transação única)
    if (qualificacoes.length > 0) {
      await supabase.rpc("sync_account_qualifications", {
        p_account_id: accountId,
        p_qualification_ids: qualificacoesSel,
      });
    }

    if (currentAccountId)
      logAccess(currentAccountId, "editar_membro", {
        edited_account_id: accountId,
      });
    router.back();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          NOME COMPLETO
        </div>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Maria Oliveira"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">E-MAIL</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@exemplo.com"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          CPF (OPCIONAL)
        </div>
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">
          DATA DE NASCIMENTO (OPCIONAL)
        </div>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      {isAdmin && (
        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">
            PERFIL
          </div>
          <div className="relative">
            <select
              value={profile}
              onChange={(e) => {
                setProfile(e.target.value);
                if (e.target.value === "admin") setGrupoId("");
              }}
              disabled={ehContaPropria}
              className="w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] text-ink outline-none disabled:opacity-50"
            >
              {PERFIS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              ▾
            </span>
          </div>
          {ehContaPropria && (
            <p className="mt-1.5 text-[11.5px] text-muted">
              Não é possível alterar o próprio perfil.
            </p>
          )}
        </div>
      )}

      {isAdmin && precisaGrupo && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold text-muted">
            GRUPO
          </div>
          <div className="relative">
            <select
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] outline-none ${
                grupoId ? "text-ink" : "text-muted"
              }`}
            >
              <option value="" disabled>
                Selecione um grupo
              </option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
              ▾
            </span>
          </div>
        </div>
      )}

      {qualificacoes.length > 0 && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold text-muted">
            QUALIFICAÇÕES
          </div>
          <div className="flex flex-col gap-2">
            {qualificacoes.map((q) => {
              const marcada = qualificacoesSel.includes(q.id);
              return (
                <label
                  key={q.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-black/10 px-3.5 py-2.5 hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => toggleQualificacao(q.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-[14px] text-ink">{q.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {ministeriosDele.length > 0 && (
        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">
            MINISTÉRIOS
          </div>
          <p className="text-[14px] text-ink">{ministeriosDele.join(", ")}</p>
        </div>
      )}

      {erro && <p className="text-[13px] text-danger">{erro}</p>}

      <div className="mt-1.5 flex flex-col gap-2.5 md:mt-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="hidden rounded-[11px] border border-black/10 px-5 py-3 text-[14px] font-semibold text-ink md:block"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={!podeSalvar || salvando}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
