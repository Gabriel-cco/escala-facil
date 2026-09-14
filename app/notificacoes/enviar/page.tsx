import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import EnviarForm from "./EnviarForm";

export default async function EnviarNotificacaoPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const account = await getCurrentAccount();
  if (!account || (account.profile !== "admin" && account.profile !== "coordinator")) {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: grupos }, { data: qualifications }, { data: ministerios }] =
    await Promise.all([
      supabase.from("groups").select("id, name").eq("active", true).order("name"),
      supabase.from("qualifications").select("id, name, group_id").order("name"),
      supabase.from("ministerios").select("id, name, group_id").order("name"),
    ]);

  return (
    <>
      <Header variant="back" title="Enviar Notificação" />
      <EnviarForm
        grupos={grupos ?? []}
        qualifications={qualifications ?? []}
        ministerios={ministerios ?? []}
      />
    </>
  );
}
