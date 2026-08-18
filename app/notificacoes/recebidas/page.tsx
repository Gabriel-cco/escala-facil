import { redirect } from "next/navigation";
import Header from "../../components/shell/Header";
import RecebidasCliente from "./RecebidasCliente";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";

export default async function RecebidasPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const account = await getCurrentAccount();

  return (
    <>
      <Header variant="back" title="Notificações" />
      <RecebidasCliente accountId={account?.account_id ?? null} />
    </>
  );
}
