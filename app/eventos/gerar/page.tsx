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

  return (
    <>
      <Header variant="back" title="Gerar mês" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <GerarEventosForm
          perfil={perfil}
          grupos={grupos ?? []}
          grupoIdInicial={activeGroupId}
        />
      </main>
    </>
  );
}
