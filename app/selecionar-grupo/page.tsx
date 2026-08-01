import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_GROUP_COOKIE } from "@/lib/active-group";
import SelecionarGrupoForm from "./SelecionarGrupoForm";

export default async function SelecionarGrupoPage() {
  // Admin que já tem grupo ativo no cookie vai direto pro dashboard
  const cookieStore = await cookies();
  const activeGroup = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
  if (activeGroup) redirect("/");

  const supabase = await createClient();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: membros } = await supabase
    .from("accounts")
    .select("group_id")
    .eq("profile", "member")
    .eq("active", true);

  const membrosPorGrupo = new Map<string, number>();
  membros?.forEach((m) => {
    if (m.group_id)
      membrosPorGrupo.set(m.group_id, (membrosPorGrupo.get(m.group_id) ?? 0) + 1);
  });

  const gruposComCount = (grupos ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    membroCount: membrosPorGrupo.get(g.id) ?? 0,
  }));

  return <SelecionarGrupoForm grupos={gruposComCount} />;
}
