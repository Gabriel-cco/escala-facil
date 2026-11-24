import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import GerarEventosForm from "./GerarEventosForm";

export default async function GerarEventosPage() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  const conta = await getCurrentAccount();
  const perfil = conta?.profile;

  if (!perfil || perfil === "member") redirect("/eventos");

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  const grupoIds = (grupos ?? []).map((g) => g.id);
  const tiposPorGrupo: Record<string, { id: string; name: string; roleIds: string[] }[]> = {};

  if (grupoIds.length > 0) {
    const { data: tipos } = await supabase
      .from("event_types")
      .select("id, name, group_id")
      .in("group_id", grupoIds)
      .order("name", { ascending: true });

    if (tipos?.length) {
      const tipoIds = tipos.map((t) => t.id);
      const { data: etrRows } = await supabase
        .from("event_type_roles")
        .select("event_type_id, role_id")
        .in("event_type_id", tipoIds);

      const rolesByTipo = new Map<string, string[]>();
      for (const row of etrRows ?? []) {
        if (!rolesByTipo.has(row.event_type_id)) rolesByTipo.set(row.event_type_id, []);
        rolesByTipo.get(row.event_type_id)!.push(row.role_id);
      }

      for (const t of tipos) {
        if (!tiposPorGrupo[t.group_id]) tiposPorGrupo[t.group_id] = [];
        tiposPorGrupo[t.group_id].push({ id: t.id, name: t.name, roleIds: rolesByTipo.get(t.id) ?? [] });
      }
    }
  }

  return (
    <>
      <Header variant="back" title="Gerar Escala Mensal" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <GerarEventosForm
          perfil={perfil}
          grupos={grupos ?? []}
          grupoIdInicial={activeGroupId}
          accountId={conta!.account_id}
          tiposPorGrupo={tiposPorGrupo}
        />
      </main>
    </>
  );
}
