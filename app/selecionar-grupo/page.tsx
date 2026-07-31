import { createClient } from "@/lib/supabase/server";
import SelecionarGrupoForm from "./SelecionarGrupoForm";

export default async function SelecionarGrupoPage() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .order("name", { ascending: true });

  return <SelecionarGrupoForm grupos={grupos ?? []} />;
}
