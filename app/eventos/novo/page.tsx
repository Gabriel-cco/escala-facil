import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getAuthUser } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import CriarEventoForm from "./CriarEventoForm";

// TEMPORÁRIO: campo de ministério visível só para o dono da plataforma.
const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

export default async function NovoEventoPage() {
  const supabase = await createClient();
  const [{ data: grupos }, conta, authUser] = await Promise.all([
    supabase.from("groups").select("id, name").order("name", { ascending: true }),
    getCurrentAccount(),
    getAuthUser(),
  ]);

  const podeGerenciarMinisterios = authUser?.email === OWNER_EMAIL;
  const grupoIds = (grupos ?? []).map((g) => g.id);

  const ministeriosPorGrupo: Record<string, { id: string; name: string }[]> = {};
  if (podeGerenciarMinisterios) {
    const { data: ministeriosData } = grupoIds.length
      ? await supabase
          .from("ministerios")
          .select("id, name, group_id")
          .in("group_id", grupoIds)
          .order("name", { ascending: true })
      : { data: [] };
    for (const m of ministeriosData ?? []) {
      if (!ministeriosPorGrupo[m.group_id]) ministeriosPorGrupo[m.group_id] = [];
      ministeriosPorGrupo[m.group_id].push({ id: m.id, name: m.name });
    }
  }

  // Tipos de evento por grupo
  const tiposPorGrupo: Record<string, { id: string; name: string; roleIds: string[] }[]> = {};
  const { data: tiposData } = grupoIds.length
    ? await supabase
        .from("event_types")
        .select("id, name, group_id, event_type_roles(role_id)")
        .in("group_id", grupoIds)
        .eq("active", true)
        .order("name", { ascending: true })
    : { data: [] };
  for (const t of tiposData ?? []) {
    if (!tiposPorGrupo[t.group_id]) tiposPorGrupo[t.group_id] = [];
    tiposPorGrupo[t.group_id].push({
      id: t.id,
      name: t.name as string,
      roleIds: ((t.event_type_roles ?? []) as { role_id: string }[]).map((r) => r.role_id),
    });
  }

  return (
    <>
      <Header variant="back" title="Criar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CriarEventoForm
          grupos={grupos ?? []}
          ministeriosPorGrupo={ministeriosPorGrupo}
          podeGerenciarMinisterios={podeGerenciarMinisterios}
          tiposPorGrupo={tiposPorGrupo}
          accountId={conta?.account_id}
        />
      </main>
    </>
  );
}
