import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import FuncaoItem from "./FuncaoItem";
import TiposEventoSection from "@/app/grupos/[id]/TiposEventoSection";

export default async function FuncoesPage() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Perfil do usuário logado para controle de botões (cache por request).
  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
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
    .select("id, name, group_id")
    .eq("active", true)
    .order("name", { ascending: true });
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);
  const { data: funcoes, error } = await funcoesQuery;

  const funcoesPorGrupo = new Map<string, { id: string; nome: string }[]>();
  funcoes?.forEach((f) => {
    const lista = funcoesPorGrupo.get(f.group_id) ?? [];
    lista.push({ id: f.id, nome: f.name });
    funcoesPorGrupo.set(f.group_id, lista);
  });

  // Tipos de evento por grupo
  const grupoIds = (grupos ?? []).map((g) => g.id);
  const { data: tiposData } = grupoIds.length
    ? await supabase
        .from("event_types")
        .select("id, name, group_id, event_type_roles(role_id)")
        .in("group_id", grupoIds)
        .eq("active", true)
        .order("name", { ascending: true })
    : { data: [] };

  const tiposPorGrupo = new Map<string, { id: string; name: string; roleIds: Set<string> }[]>();
  for (const t of tiposData ?? []) {
    const lista = tiposPorGrupo.get(t.group_id) ?? [];
    lista.push({
      id: t.id,
      name: t.name as string,
      roleIds: new Set(((t.event_type_roles ?? []) as { role_id: string }[]).map((r) => r.role_id)),
    });
    tiposPorGrupo.set(t.group_id, lista);
  }

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

        <div className="flex flex-col gap-8">
          {grupos?.map((grupo) => {
            const lista = funcoesPorGrupo.get(grupo.id) ?? [];
            const tipos = tiposPorGrupo.get(grupo.id) ?? [];
            const roles = lista.map((f) => ({ id: f.id, name: f.nome }));
            return (
              <div key={grupo.id} className="flex flex-col gap-5">
                {grupos.length > 1 && (
                  <div className="text-[15px] font-bold text-ink">{grupo.name}</div>
                )}
                {lista.length > 0 && (
                  <section>
                    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-faint">
                      Funções
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
                )}
                {podeGerenciar && (
                  <TiposEventoSection
                    groupId={grupo.id}
                    roles={roles}
                    tipos={tipos}
                    podeGerenciar={podeGerenciar}
                  />
                )}
              </div>
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
