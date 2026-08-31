import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import CriarEventoForm from "@/app/eventos/novo/CriarEventoForm";

// Versão interceptada de /eventos/novo: abre como modal sobre a lista.
export default async function CriarEventoModal() {
  const supabase = await createClient();
  const [{ data: grupos }, conta] = await Promise.all([
    supabase.from("groups").select("id, name").order("name", { ascending: true }),
    getCurrentAccount(),
  ]);

  const grupoIds = (grupos ?? []).map((g) => g.id);
  const { data: ministeriosData } = grupoIds.length
    ? await supabase
        .from("ministerios")
        .select("id, name, group_id")
        .in("group_id", grupoIds)
        .order("name", { ascending: true })
    : { data: [] };

  const ministeriosPorGrupo: Record<string, { id: string; name: string }[]> = {};
  for (const m of ministeriosData ?? []) {
    if (!ministeriosPorGrupo[m.group_id]) ministeriosPorGrupo[m.group_id] = [];
    ministeriosPorGrupo[m.group_id].push({ id: m.id, name: m.name });
  }

  return (
    <Modal title="Criar evento">
      <CriarEventoForm
        grupos={grupos ?? []}
        ministeriosPorGrupo={ministeriosPorGrupo}
        accountId={conta?.account_id}
      />
    </Modal>
  );
}
