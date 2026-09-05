"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarMembroAction } from "./actions";

type Grupo = { id: string; name: string };
type Ministerio = { id: string; name: string };

const PERFIS = [
  { value: "member", label: "Membro" },
  { value: "coordinator", label: "Coordenador" },
  { value: "admin", label: "Administrador" },
];

export default function CadastrarMembroForm({
  grupos,
  accountId,
  isAdmin,
  grupoIdFixo,
  ministerios = [],
}: {
  grupos: Grupo[];
  accountId?: string;
  isAdmin: boolean;
  grupoIdFixo?: string;
  ministerios?: Ministerio[];
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [profile, setProfile] = useState("member");
  const [grupoId, setGrupoId] = useState(isAdmin ? "" : (grupoIdFixo ?? ""));
  const [ministeriosSel, setMinisteriosSel] = useState<string[]>([]);
  const [ministeriosDinamicos, setMinisteriosDinamicos] = useState<Ministerio[]>([]);
  const [enviarBoasVindas, setEnviarBoasVindas] = useState(true);
  const [emailExistente, setEmailExistente] = useState<{ userId: string; nome: string } | null>(null);
  const [vinculoConfirmado, setVinculoConfirmado] = useState(false);

  async function checkEmailExistente() {
    const e = email.trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    setEmailExistente(null);
    setVinculoConfirmado(false);
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id, name")
      .eq("email", e)
      .maybeSingle();
    if (data) setEmailExistente({ userId: (data as { id: string }).id, nome: (data as { name: string }).name });
  }

  async function carregarMinisteriosDoGrupo(gId: string) {
    setMinisteriosSel([]);
    if (!gId) { setMinisteriosDinamicos([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("ministerios")
      .select("id, name")
      .eq("group_id", gId)
      .order("name");
    setMinisteriosDinamicos(data ?? []);
  }
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const router = useRouter();

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const grupoEfetivo = isAdmin ? grupoId : (grupoIdFixo ?? "");
  const precisaGrupo = isAdmin ? profile !== "admin" : true;
  const podeSalvar =
    nome.trim().length > 0 &&
    emailValido &&
    (!precisaGrupo || grupoEfetivo !== "");

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setErro("");
    setSalvando(true);

    const resultado = await criarMembroAction({
      nome: nome.trim(),
      email: email.trim(),
      cpf: cpf.trim() || null,
      birthDate: birthDate || null,
      profile: isAdmin ? profile : "member",
      groupId: precisaGrupo ? (grupoEfetivo || null) : null,
      enviarBoasVindas,
      accountId,
      ministerioIds: ministeriosSel,
      existingUserId: emailExistente && vinculoConfirmado ? emailExistente.userId : undefined,
    });

    if ("error" in resultado) {
      setSalvando(false);
      setErro("Erro ao salvar: " + resultado.error);
      return;
    }

    setSucesso(
      enviarBoasVindas
        ? "Membro criado — email de boas-vindas enviado"
        : "Membro criado"
    );
    setTimeout(() => {
      router.back();
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">NOME COMPLETO</div>
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
          onChange={(e) => { setEmail(e.target.value); setEmailExistente(null); setVinculoConfirmado(false); }}
          onBlur={checkEmailExistente}
          placeholder="maria@exemplo.com"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
        {emailExistente && !vinculoConfirmado ? (
          <div className="mt-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="text-[12.5px] text-amber-800">
              Este email já está cadastrado como <span className="font-semibold">{emailExistente.nome}</span>. Deseja adicionar um novo vínculo (perfil + grupo) para essa pessoa?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setVinculoConfirmado(true)}
                className="rounded-[8px] bg-amber-600 px-3 py-1 text-[12px] font-semibold text-white"
              >
                Sim, adicionar vínculo
              </button>
              <button
                type="button"
                onClick={() => { setEmail(""); setEmailExistente(null); }}
                className="rounded-[8px] border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : vinculoConfirmado ? (
          <p className="mt-1.5 text-[11.5px] text-amber-700">
            Novo vínculo será criado para <span className="font-semibold">{emailExistente?.nome}</span> — o cadastro de usuário já existente será reaproveitado.
          </p>
        ) : (
          <p className="mt-1.5 text-[11.5px] text-muted">
            Usado para vincular o acesso quando a pessoa entrar com o Google.
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">CPF (OPCIONAL)</div>
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      <div>
        <div className="mb-2 text-[12px] font-semibold text-muted">DATA DE NASCIMENTO (OPCIONAL)</div>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 text-[15px] text-ink outline-none"
        />
      </div>

      {isAdmin && (
        <div>
          <div className="mb-2 text-[12px] font-semibold text-muted">PERFIL</div>
          <div className="relative">
            <select
              value={profile}
              onChange={(e) => {
                setProfile(e.target.value);
                if (e.target.value === "admin") setGrupoId("");
              }}
              className="w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] text-ink outline-none"
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
        </div>
      )}

      {isAdmin && precisaGrupo && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold text-muted">GRUPO</div>
          {grupos.length === 0 ? (
            <p className="text-[13px] text-muted">
              Cadastre um grupo antes de cadastrar membros.
            </p>
          ) : (
            <div className="relative">
              <select
                value={grupoId}
                onChange={(e) => { setGrupoId(e.target.value); carregarMinisteriosDoGrupo(e.target.value); }}
                className={`w-full appearance-none rounded-[14px] border border-black/10 bg-paper px-4 py-3.5 pr-10 text-[15px] outline-none ${
                  grupoId ? "text-ink" : "text-muted"
                }`}
              >
                <option value="" disabled>
                  Selecione um grupo
                </option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted">
                ▾
              </span>
            </div>
          )}
        </div>
      )}

      {!isAdmin && grupos.length === 0 && (
        <p className="text-[13px] text-muted">
          Cadastre um grupo antes de cadastrar membros.
        </p>
      )}

      {((!isAdmin && grupoIdFixo) || (isAdmin && grupoId && precisaGrupo)) && (
        <div>
          <div className="mb-2.5 text-[12px] font-semibold text-muted">
            MINISTÉRIOS (OPCIONAL)
          </div>
          {(isAdmin ? ministeriosDinamicos : ministerios).length === 0 ? (
            <p className="text-[13px] text-muted">
              Nenhum ministério cadastrado para este grupo.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(isAdmin ? ministeriosDinamicos : ministerios).map((m) => {
                const marcado = ministeriosSel.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-black/10 px-3.5 py-2.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() =>
                        setMinisteriosSel((prev) =>
                          marcado ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-[14px] text-ink">{m.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enviarBoasVindas}
          onChange={(e) => setEnviarBoasVindas(e.target.checked)}
          className="h-4 w-4 rounded accent-primary"
        />
        <span className="text-[14px] text-ink">Enviar email de boas-vindas</span>
      </label>

      {sucesso && (
        <p className="rounded-[12px] bg-green-50 px-4 py-3 text-[13.5px] font-medium text-green-700">
          {sucesso}
        </p>
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
          disabled={!podeSalvar || salvando || sucesso !== ""}
          className="w-full rounded-2xl bg-primary py-4 text-[15px] font-semibold text-paper transition-opacity disabled:pointer-events-none disabled:opacity-40 md:w-auto md:rounded-[11px] md:px-6 md:py-3 md:text-[14px]"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
