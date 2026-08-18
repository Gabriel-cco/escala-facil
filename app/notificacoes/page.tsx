import { redirect } from "next/navigation";
import Header from "../components/shell/Header";
import NotificacoesCliente from "./NotificacoesCliente";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";

export default async function NotificacoesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const account = await getCurrentAccount();

  // Esta tela é de gestão das ENVIADAS (admin/coordinator). Membro só vê as
  // recebidas, pelo sino.
  if (!account || account.profile === "member") {
    redirect("/notificacoes/recebidas");
  }

  return (
    <>
      <Header variant="back" title="Notificações" />
      <NotificacoesCliente accountId={account.account_id} />
    </>
  );
}
