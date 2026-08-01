import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "../../components/shell/Header";
import GerarEventosForm from "./GerarEventosForm";

export default async function GerarEventosPage() {
  const supabase = await createClient();
  const activeGroupId = await getActiveGroupId();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: pRows } = authUser
    ? await supabase.rpc("get_account_by_auth_id", { p_auth_id: authUser.id })
    : { data: null };

  const perfil = pRows?.[0]?.profile as string | undefined;

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
