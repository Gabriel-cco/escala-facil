import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import EditarMembroForm from "@/app/membros/EditarMembroForm";

export default async function EditarMembroModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // id = account id
  const supabase = await createClient();
  const conta = await getCurrentAccount();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, group_id, user:users(id, name, email, cpf, birth_date)")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const user = Array.isArray(account.user) ? account.user[0] : account.user;
  if (!user) notFound();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  return (
    <Modal title="Editar membro">
      <EditarMembroForm
        accountId={account.id}
        userId={user.id}
        nomeInicial={user.name ?? ""}
        emailInicial={user.email ?? ""}
        cpfInicial={user.cpf ?? ""}
        birthDateInicial={user.birth_date ?? ""}
        grupoIdInicial={account.group_id ?? ""}
        grupos={grupos ?? []}
        currentAccountId={conta?.account_id}
      />
    </Modal>
  );
}
