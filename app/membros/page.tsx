import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import MembroItem from "./MembroItem";
import { Paginacao } from "../components/Paginacao";

const PP_DEFAULT = 25;

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string; p?: string; pp?: string }>;
}) {
  const { inativos, p: pParam, pp: ppParam } = await searchParams;
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

  if (activeGroupId) query = query.eq("group_id", activeGroupId);
  if (!mostrarInativos) query = query.eq("active", true);

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

  // Link do toggle inativos preserva pp mas reseta para página 1
  const toggleHref = mostrarInativos
    ? `/membros${pp !== PP_DEFAULT ? `?pp=${pp}` : ""}`
    : `/membros?inativos=1${pp !== PP_DEFAULT ? `&pp=${pp}` : ""}`;

  return (
    <>
      <Header variant="root" title="Membros" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-muted">
            {totalItens} pessoa{totalItens !== 1 ? "s" : ""}
          </div>
          {podeGerenciar && (
            <Link
              href="/membros/novo"
              className="hidden flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
            >
              + Cadastrar pessoa
            </Link>
          )}
        </div>

        {podeGerenciar && (
          <Link
            href="/membros/novo"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
          >
            + Cadastrar pessoa
          </Link>
        )}

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {podeGerenciar && (
          <div className="flex items-center justify-between gap-3 px-0.5 md:px-0">
            <div className="text-[12px] text-muted">
              {mostrarInativos
                ? "Mostrando ativos e inativos"
                : "Apenas pessoas ativas"}
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

        {pessoas.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhuma pessoa cadastrada ainda.
          </p>
        )}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:items-start md:gap-3.5">
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

        {totalItens > pp && (
          <Paginacao
            paginaAtual={paginaAtual}
            totalItens={totalItens}
            itensPorPagina={pp}
          />
        )}
      </main>
    </>
  );
}
