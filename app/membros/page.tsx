import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import MembroItem from "./MembroItem";

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

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
      "id, profile, active, suspended_until, suspension_reason, user:users(id, name, email), group:groups(name)"
    );
  if (activeGroupId) query = query.eq("group_id", activeGroupId);
  if (!mostrarInativos) query = query.eq("active", true);
  const { data: accounts, error } = await query;

  const pessoas = (accounts ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      const g = Array.isArray(a.group) ? a.group[0] : a.group;
      return {
        id: a.id,
        userId: u?.id ?? "",
        nome: u?.name ?? "—",
        email: u?.email ?? "",
        perfil: a.profile as "admin" | "coordinator" | "member",
        grupoNome: g?.name ?? "Sem grupo",
        active: a.active,
        suspensoAte: a.suspended_until as string | null,
        motivoSuspensao: a.suspension_reason as string | null,
      };
    })
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

  return (
    <>
      <Header variant="root" title="Membros" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-muted">
            {pessoas.length} pessoa{pessoas.length !== 1 ? "s" : ""}
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
              href={mostrarInativos ? "/membros" : "/membros?inativos=1"}
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
      </main>
    </>
  );
}
