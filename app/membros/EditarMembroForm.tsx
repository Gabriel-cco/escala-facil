"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logAccess } from "@/lib/access-log";

type Grupo = { id: string; name: string };
type Qualificacao = { id: string; name: string };
type MinisterioVinculado = { ministerio_id: string; name: string };
type MinisterioDisponivel = { id: string; name: string };

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
  ministeriosVinculados = [],
  ministeriosDisponiveis,
  responsavelNomeInicial = "",
  responsavelTelefoneInicial = "",
  responsavelEmailInicial = "",
  termoAssinadoInicial = false,
  termoDataInicial = "",
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
  ministeriosVinculados?: MinisterioVinculado[];
  ministeriosDisponiveis?: MinisterioDisponivel[];
  responsavelNomeInicial?: string;
  responsavelTelefoneInicial?: string;
  responsavelEmailInicial?: string;
  termoAssinadoInicial?: boolean;
  termoDataInicial?: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [cpf, setCpf] = useState(cpfInicial);
  const [birthDate, setBirthDate] = useState(birthDateInicial);
  const [grupoId, setGrupoId] = useState(grupoIdInicial);
  const [profile, setProfile] = useState(perfilInicial);
  const [qualificacoesSel, setQualificacoesSel] = useState<string[]>(qualificacoesAtuais);

  const [responsavelNome, setResponsavelNome] = useState(responsavelNomeInicial);
  const [responsavelTelefone, setResponsavelTelefone] = useState(responsavelTelefoneInicial);
  const [responsavelEmail, setResponsavelEmail] = useState(responsavelEmailInicial);
  const [termoAssinado, setTermoAssinado] = useState(termoAssinadoInicial);
  const [termoData, setTermoData] = useState(termoDataInicial);

  function ehMenorDeIdade(dataNascimento: string): boolean {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const diffMes = hoje.getMonth() - nascimento.getMonth();
    if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade < 18;
  }

  const menor = birthDate ? ehMenorDeIdade(birthDate) : false;

  const [vinculados, setVinculados] = useState<MinisterioVinculado[]>(ministeriosVinculados);
  const [candidatoSel, setCandidatoSel] = useState<string>(() => {
    const ids = new Set(ministeriosVinculados.map((v) => v.ministerio_id));
    return (ministeriosDisponiveis ?? []).find((d) => !ids.has(d.id))?.id ?? "";
  });
  const [adicionandoMin, setAdicionandoMin] = useState(false);
  const [removendoMin, setRemovendoMin] = useState<string | null>(null);
  const [erroMin, setErroMin] = useState("");

  const candidatos = (ministeriosDisponiveis ?? []).filter(
    (d) => !vinculados.some((v) => v.ministerio_id === d.id)
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const ehContaPropria = accountId === currentAccountId;
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const precisaGrupo = isAdmin && profile !== "admin";
  const podeSalvar =
    nome.trim().length > 0 &&
    emailValido &&
    (!precisaGrupo || grupoId !== "") &&
    (!menor || (responsavelNome.trim().length > 0 && responsavelTelefone.trim().length > 0));

  function toggleQualificacao(id: string) {
    setQualificacoesSel((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  }

  async function adicionarMinisterio() {
    if (!candidatoSel || adicionandoMin) return;
    setAdicionandoMin(true);
    setErroMin("");
    const supabase = createClient();
    const { error } = await supabase
      .from("ministerio_members")
      .insert({ ministerio_id: candidatoSel, account_id: accountId });
    setAdicionandoMin(false);
    if (error) { setErroMin("Erro ao adicionar: " + error.message); return; }
    const nome = (ministeriosDisponiveis ?? []).find((d) => d.id === candidatoSel)?.name ?? "";
    const novosVinculados = [...vinculados, { ministerio_id: candidatoSel, name: nome }];
    setVinculados(novosVinculados);
    const novosCandidatos = (ministeriosDisponiveis ?? []).filter(
      (d) => !novosVinculados.some((v) => v.ministerio_id === d.id)
    );
    setCandidatoSel(novosCandidatos[0]?.id ?? "");
  }

  async function removerMinisterio(ministerioId: string) {
    if (removendoMin) return;
    setRemovendoMin(ministerioId);
    setErroMin("");
    const supabase = createClient();
    const { error } = await supabase
      .from("ministerio_members")
      .delete()
      .eq("ministerio_id", ministerioId)
      .eq("account_id", accountId);
    setRemovendoMin(null);
    if (error) { setErroMin("Erro ao remover: " + error.message); return; }
    const novosVinculados = vinculados.filter((v) => v.ministerio_id !== ministerioId);
    setVinculados(novosVinculados);
    if (!candidatoSel) {
      const novosCandidatos = (ministeriosDisponiveis ?? []).filter(
        (d) => !novosVinculados.some((v) => v.ministerio_id === d.id)
      );
      setCandidatoSel(novosCandidatos[0]?.id ?? "");
    }
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
        ...(menor ? {
          responsavel_nome: responsavelNome.trim() || null,
          responsavel_telefone: responsavelTelefone.trim() || null,
          responsavel_email: responsavelEmail.trim() || null,
          termo_consentimento_assinado: termoAssinado,
          termo_consentimento_data: termoAssinado && termoData ? termoData : null,
        } : {}),
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

      {menor && (
        <div className="flex flex-col gap-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-[12.5px] font-semibold text-amber-800">
            Menor de idade — dados do responsável obrigatórios
          </p>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted">NOME DO RESPONSÁVEL *</div>
            <input
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              placeholder="Ex.: José Oliveira"
              className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted">TELEFONE / WHATSAPP *</div>
            <input
              value={responsavelTelefone}
              onChange={(e) => setResponsavelTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold text-muted">E-MAIL DO RESPONSÁVEL (OPCIONAL)</div>
            <input
              type="email"
              value={responsavelEmail}
              onChange={(e) => setResponsavelEmail(e.target.value)}
              placeholder="responsavel@exemplo.com"
              className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={termoAssinado}
              onChange={(e) => { setTermoAssinado(e.target.checked); if (!e.target.checked) setTermoData(""); }}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-[14px] text-ink">Termo de consentimento assinado</span>
          </label>

          {termoAssinado && (
            <div>
              <div className="mb-2 text-[12px] font-semibold text-muted">DATA DA ASSINATURA</div>
              <input
                type="date"
                value={termoData}
                onChange={(e) => setTermoData(e.target.value)}
                className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
              />
            </div>
          )}
        </div>
      )}

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

      {ministeriosDisponiveis !== undefined && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold text-muted">MINISTÉRIOS</div>
          <div className="flex flex-col gap-1">
            {vinculados.length === 0 && (
              <p className="text-[13px] text-muted">Nenhum ministério vinculado.</p>
            )}
            {vinculados.map((v) => (
              <div
                key={v.ministerio_id}
                className="flex items-center justify-between rounded-[12px] border border-black/10 px-3.5 py-2.5"
              >
                <span className="text-[14px] text-ink">{v.name}</span>
                <button
                  type="button"
                  onClick={() => removerMinisterio(v.ministerio_id)}
                  disabled={removendoMin === v.ministerio_id}
                  className="text-[12px] font-medium text-danger disabled:opacity-50"
                >
                  {removendoMin === v.ministerio_id ? "..." : "Remover"}
                </button>
              </div>
            ))}
            {candidatos.length > 0 && (
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={candidatoSel}
                    onChange={(e) => setCandidatoSel(e.target.value)}
                    className="w-full appearance-none rounded-[12px] border border-black/10 bg-surface px-3.5 py-2.5 pr-8 text-[14px] text-ink outline-none"
                  >
                    {candidatos.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">▾</span>
                </div>
                <button
                  type="button"
                  onClick={adicionarMinisterio}
                  disabled={!candidatoSel || adicionandoMin}
                  className="rounded-[12px] bg-primary px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  {adicionandoMin ? "..." : "Adicionar"}
                </button>
              </div>
            )}
            {vinculados.length > 0 && candidatos.length === 0 && (
              <p className="mt-1 text-[12px] text-muted">Todos os ministérios já vinculados.</p>
            )}
            {erroMin && <p className="mt-1 text-[12px] text-danger">{erroMin}</p>}
          </div>
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
