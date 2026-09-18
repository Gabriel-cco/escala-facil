import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getAuthUser } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import CriarEventoForm from "@/app/eventos/novo/CriarEventoForm";

// TEMPORÁRIO: campo de ministério visível só para o dono da plataforma.
const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

// Versão interceptada de /eventos/novo: abre como modal sobre a lista.
export default async function CriarEventoModal() {
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
    <Modal title="Criar evento">
      <CriarEventoForm
        grupos={grupos ?? []}
        ministeriosPorGrupo={ministeriosPorGrupo}
        podeGerenciarMinisterios={podeGerenciarMinisterios}
        tiposPorGrupo={tiposPorGrupo}
        accountId={conta?.account_id}
      />
    </Modal>
  );
}
