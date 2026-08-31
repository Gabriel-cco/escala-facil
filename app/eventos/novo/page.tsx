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

  const ministeriosPorGrupo: Record<string, { id: string; name: string }[]> = {};
  if (podeGerenciarMinisterios) {
    const grupoIds = (grupos ?? []).map((g) => g.id);
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

  return (
    <>
      <Header variant="back" title="Criar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CriarEventoForm
          grupos={grupos ?? []}
          ministeriosPorGrupo={ministeriosPorGrupo}
          podeGerenciarMinisterios={podeGerenciarMinisterios}
          accountId={conta?.account_id}
        />
      </main>
    </>
  );
}
