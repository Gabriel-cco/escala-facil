import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";
import NotificacoesCliente from "./NotificacoesCliente";
import type { Profile } from "@/lib/types";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  const account = pRows?.[0] as { account_id: string; profile: Profile } | undefined;

  return (
    <>
      <Header variant="back" title="Notificações" />
      <NotificacoesCliente
        accountId={account?.account_id ?? null}
        perfil={account?.profile ?? null}
      />
    </>
  );
}
