import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import EnviarForm from "./EnviarForm";

export default async function EnviarNotificacaoPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  const account = pRows?.[0] as { profile?: string } | undefined;

  if (!account || (account.profile !== "admin" && account.profile !== "coordinator")) {
    redirect("/");
  }

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <>
      <Header variant="back" title="Enviar Notificação" />
      <EnviarForm grupos={grupos ?? []} />
    </>
  );
}
