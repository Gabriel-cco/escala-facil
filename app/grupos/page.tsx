import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import GrupoItem from "./GrupoItem";

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ inativos?: string }>;
}) {
  const { inativos } = await searchParams;
  const mostrarInativos = inativos === "1";

  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  // Perfil do usuário logado para controle de botões (cache por request).
  const conta = await getCurrentAccount();
  const perfil = conta?.profile;
  const podeGerenciar = perfil === "admin";

  let gruposQuery = supabase
    .from("groups")
    .select("id, name, description, active")
    .order("name", { ascending: true });
  if (activeGroupId) gruposQuery = gruposQuery.eq("id", activeGroupId);
  if (!mostrarInativos) gruposQuery = gruposQuery.eq("active", true);
  const { data: grupos, error } = await gruposQuery;

  // Counts (sempre só ativos para refletir estado atual).
  let membrosQuery = supabase
    .from("accounts")
    .select("group_id")
    .eq("profile", "member")
    .eq("active", true);
  if (activeGroupId) membrosQuery = membrosQuery.eq("group_id", activeGroupId);
  const { data: membros } = await membrosQuery;

  let funcoesQuery = supabase
    .from("roles")
    .select("group_id")
    .eq("active", true);
  if (activeGroupId) funcoesQuery = funcoesQuery.eq("group_id", activeGroupId);
  const { data: funcoes } = await funcoesQuery;

  const membrosPorGrupo = new Map<string, number>();
  membros?.forEach((m) =>
    membrosPorGrupo.set(m.group_id, (membrosPorGrupo.get(m.group_id) ?? 0) + 1)
  );
  const funcoesPorGrupo = new Map<string, number>();
  funcoes?.forEach((f) =>
    funcoesPorGrupo.set(f.group_id, (funcoesPorGrupo.get(f.group_id) ?? 0) + 1)
  );

  const totalInativos = (grupos ?? []).filter((g) => !g.active).length;

  return (
    <>
      <Header variant="root" title="Grupos" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:gap-5 md:p-0">
        {/* Contagem + criar (desktop) */}
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-muted">
            {grupos?.length ?? 0} grupo{(grupos?.length ?? 0) !== 1 ? "s" : ""}
          </div>
          {podeGerenciar && (
            <Link
              href="/grupos/novo"
              className="hidden flex-none items-center gap-2 rounded-[14px] bg-primary px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-hover md:inline-flex"
            >
              + Criar grupo
            </Link>
          )}
        </div>

        {podeGerenciar && (
          <Link
            href="/grupos/novo"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 p-3.5 text-[13.5px] font-semibold text-ink md:hidden"
          >
            + Novo grupo
          </Link>
        )}

        {error && (
          <p className="text-[13px] text-danger">Erro: {error.message}</p>
        )}

        {/* Toggle mostrar inativos */}
        {podeGerenciar && (
          <div className="flex items-center justify-between gap-3 px-0.5 md:px-0">
            <div className="text-[12px] text-muted">
              {mostrarInativos ? "Mostrando ativos e inativos" : "Apenas grupos ativos"}
            </div>
            <Link
              href={mostrarInativos ? "/grupos" : "/grupos?inativos=1"}
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

        {grupos && grupos.length === 0 && (
          <p className="text-[13px] text-muted">
            {mostrarInativos
              ? "Nenhum grupo cadastrado ainda."
              : totalInativos > 0
              ? `Nenhum grupo ativo. Há ${totalInativos} inativo${totalInativos > 1 ? "s" : ""} — ative o toggle acima para ver.`
              : "Nenhum grupo cadastrado ainda."}
          </p>
        )}

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:gap-3.5">
          {grupos?.map((grupo) => (
            <GrupoItem
              key={grupo.id}
              grupo={{
                id: grupo.id,
                name: grupo.name,
                description: grupo.description,
                active: grupo.active,
                membroCount: membrosPorGrupo.get(grupo.id) ?? 0,
                funcaoCount: funcoesPorGrupo.get(grupo.id) ?? 0,
              }}
              podeGerenciar={podeGerenciar}
            />
          ))}
        </div>
      </main>
    </>
  );
}
