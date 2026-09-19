import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import MembroItem from "./MembroItem";
import { Paginacao } from "../components/Paginacao";
import { BuscaInput } from "./BuscaInput";
import { FiltroQualificacoes } from "./FiltroQualificacoes";

const PP_DEFAULT = 10;

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string; p?: string; pp?: string; busca?: string; qual?: string }>;
}) {
  const { inativos, p: pParam, pp: ppParam, busca = "", qual = "" } = await searchParams;
  const mostrarInativos = inativos === "1";
  const pp = Math.max(10, Math.min(50, Number(ppParam ?? PP_DEFAULT)));
  const p = Math.max(1, Number(pParam ?? 1));
  const de = (p - 1) * pp;
  const ate = de + pp - 1;

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
  const podeGerenciar = perfil === "admin" || perfil === "coordinator";
  const podeVerPerfil = perfil === "admin";
  const currentAccountId = conta?.account_id ?? "";

  let query = supabase
    .from("accounts")
    .select(
      "id, profile, active, suspended_until, suspension_reason, user:users(id, name, email, birth_date, responsavel_nome, responsavel_telefone, responsavel_email, termo_consentimento_assinado, termo_consentimento_data), group:groups(name)",
      { count: "exact" }
    )
    .order("name" as never, { referencedTable: "users" } as never);

  // Carrega qualificações do grupo para os chips de filtro
  const qualificacoes: { id: string; name: string }[] = [];
  if (activeGroupId) {
    const { data: qData } = await supabase
      .from("qualifications")
      .select("id, name")
      .eq("group_id", activeGroupId)
      .order("name");
    qualificacoes.push(...(qData ?? []));
  }

  // Validação: qualificação selecionada deve pertencer ao grupo atual
  const qualId = qualificacoes.some((q) => q.id === qual) ? qual : "";

  if (activeGroupId) query = query.eq("group_id", activeGroupId);
  if (!mostrarInativos) query = query.eq("active", true);
  if (busca.trim()) query = query.ilike("users.name" as never, `%${busca.trim()}%`);

  // Filtro por qualificação: busca account_ids na tabela de vínculo
  if (qualId) {
    const { data: aqData } = await supabase
      .from("account_qualifications")
      .select("account_id")
      .eq("qualification_id", qualId);
    const accountIds = (aqData ?? []).map((r) => (r as { account_id: string }).account_id);
    query = accountIds.length > 0
      ? query.in("id", accountIds)
      : query.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data: accounts, count, error } = await query.range(de, ate);

  const totalItens = count ?? 0;
  const paginaAtual = Math.max(1, Math.min(p, Math.ceil(totalItens / pp) || 1));

  const pessoas = (accounts ?? []).map((a) => {
    const u = Array.isArray(a.user) ? a.user[0] : a.user;
    const g = Array.isArray(a.group) ? a.group[0] : a.group;
    const ux = u as typeof u & {
      birth_date?: string | null;
      responsavel_nome?: string | null;
      responsavel_telefone?: string | null;
      responsavel_email?: string | null;
      termo_consentimento_assinado?: boolean;
      termo_consentimento_data?: string | null;
    };
    return {
      id: a.id,
      userId: ux?.id ?? "",
      nome: ux?.name ?? "—",
      email: ux?.email ?? "",
      perfil: a.profile as "admin" | "coordinator" | "member",
      grupoNome: g?.name ?? "Sem grupo",
      active: a.active,
      suspensoAte: a.suspended_until as string | null,
      motivoSuspensao: a.suspension_reason as string | null,
      birthDate: ux?.birth_date ?? null,
      responsavelNome: ux?.responsavel_nome ?? null,
      responsavelTelefone: ux?.responsavel_telefone ?? null,
      responsavelEmail: ux?.responsavel_email ?? null,
      termoAssinado: ux?.termo_consentimento_assinado ?? false,
      termoData: ux?.termo_consentimento_data ?? null,
    };
  });

  // Link do toggle inativos preserva pp e busca mas reseta para página 1
  const baseParams = new URLSearchParams();
  if (pp !== PP_DEFAULT) baseParams.set("pp", String(pp));
  if (busca.trim()) baseParams.set("busca", busca.trim());
  if (qualId) baseParams.set("qual", qualId);
  const onParams = new URLSearchParams(baseParams);
  onParams.set("inativos", "1");
  const toggleHref = mostrarInativos
    ? `/membros${baseParams.size > 0 ? `?${baseParams}` : ""}`
    : `/membros?${onParams}`;

  return (
    <>
      <Header variant="root" title="Membros" />
      <main className="flex flex-1 flex-col gap-3 px-[18px] pb-6 pt-0.5 md:gap-4 md:p-0">
        {/* Controles mobile — acima do card */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {podeGerenciar && (
            <Link
              href="/membros/novo"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink"
            >
              + Cadastrar pessoa
            </Link>
          )}

          <BuscaInput valorInicial={busca} />

          {qualificacoes.length > 0 && (
            <FiltroQualificacoes qualificacoes={qualificacoes} selecionada={qualId} />
          )}

          {podeGerenciar && (
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="text-[12px] text-muted">
                {mostrarInativos ? "Ativos e inativos" : "Apenas ativos"}
              </div>
              <Link
                href={toggleHref}
                scroll={false}
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
              </Link>
            </div>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {/* Card container */}
        <div className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-paper">
          {/* Header — desktop only */}
          <div className="hidden items-center justify-between border-b border-black/[0.06] px-5 py-4 md:flex">
            <span className="text-[17px] font-semibold text-ink">Membros</span>
            <div className="flex items-center gap-4">
              <BuscaInput valorInicial={busca} />
              {podeGerenciar && (
                <Link
                  href={toggleHref}
                  scroll={false}
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
                </Link>
              )}
              {podeGerenciar && (
                <Link
                  href="/membros/novo"
                  className="flex-none rounded-[14px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  + Cadastrar membro
                </Link>
              )}
            </div>
          </div>

          {/* Faixa de filtro por qualificação — somente desktop (mobile está fora do card) */}
          {qualificacoes.length > 0 && (
            <div className="hidden border-b border-black/[0.06] px-5 py-3 md:flex">
              <FiltroQualificacoes qualificacoes={qualificacoes} selecionada={qualId} />
            </div>
          )}

          {/* Lista */}
          {pessoas.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted">
              Nenhuma pessoa cadastrada ainda.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-black/[0.06]">
              {pessoas.map((pessoa) => (
                <MembroItem
                  key={pessoa.id}
                  membro={pessoa}
                  podeGerenciar={podeGerenciar}
                  podeVerPerfil={podeVerPerfil}
                  currentAccountId={currentAccountId}
                />
              ))}
            </div>
          )}

          <Paginacao
            paginaAtual={paginaAtual}
            totalItens={totalItens}
            itensPorPagina={pp}
          />
        </div>
      </main>
    </>
  );
}
