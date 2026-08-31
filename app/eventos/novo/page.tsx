import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import CriarEventoForm from "./CriarEventoForm";

export default async function NovoEventoPage() {
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
    <>
      <Header variant="back" title="Criar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CriarEventoForm
          grupos={grupos ?? []}
          ministeriosPorGrupo={ministeriosPorGrupo}
          accountId={conta?.account_id}
        />
      </main>
    </>
  );
}
