import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "../components/shell/Header";
import FuncaoItem from "./FuncaoItem";

export default async function FuncoesPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Perfil do usuário logado para controle de botões.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: pRows } = authUser
    ? await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id })
    : { data: null };
  const perfil = pRows?.[0]?.profile as string | undefined;
  const podeGerenciar = perfil === "admin" || perfil === "coordinator";

  let gruposQuery = supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });
  if (activeGroupId) gruposQuery = gruposQuery.eq("id", activeGroupId);
  const { data: grupos } = await gruposQuery;

  let funcoesQuery = supabase
    .from("roles")
    .select("id, name, group_id, active")
    .order("name", { ascending: true });
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);
  if (!mostrarInativos) funcoesQuery = funcoesQuery.eq("active", true);
  const { data: funcoes, error } = await funcoesQuery;

  const funcoesPorGrupo = new Map<
    string,
    { id: string; nome: string; active: boolean }[]
  >();
  funcoes?.forEach((f) => {
    const lista = funcoesPorGrupo.get(f.group_id) ?? [];
    lista.push({ id: f.id, nome: f.name, active: f.active });
    funcoesPorGrupo.set(f.group_id, lista);
  });

  return (
    <>
      <Header variant="root" title="Funções" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        {podeGerenciar && (
          <div className="hidden justify-end md:flex">
            <Link
              href="/funcoes/nova"
              className="flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
            >
              + Criar função
            </Link>
          </div>
        )}

        {podeGerenciar && (
          <Link
            href="/funcoes/nova"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
          >
            + Nova função
          </Link>
        )}

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {/* Toggle mostrar inativos */}
        {podeGerenciar && (
          <div className="flex items-center justify-between gap-3 px-0.5 md:px-0">
            <div className="text-[12px] text-muted">
              {mostrarInativos
                ? "Mostrando ativas e inativas"
                : "Apenas funções ativas"}
            </div>
            <Link
              href={mostrarInativos ? "/funcoes" : "/funcoes?inativos=1"}
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

        <div className="flex flex-col gap-6">
          {grupos?.map((grupo) => {
            const lista = funcoesPorGrupo.get(grupo.id) ?? [];
            if (lista.length === 0) return null;
            return (
              <section key={grupo.id}>
                <div className="mb-2.5 text-[15px] font-bold text-ink">
                  {grupo.name}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lista.map((f) => (
                    <FuncaoItem
                      key={f.id}
                      funcao={f}
                      podeGerenciar={podeGerenciar}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {funcoes && funcoes.length === 0 && (
          <p className="text-[13px] text-muted">
            Nenhuma função cadastrada ainda.
          </p>
        )}
      </main>
    </>
  );
}
