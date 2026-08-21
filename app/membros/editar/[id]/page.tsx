import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../../../components/shell/Header";
import EditarMembroForm from "../../EditarMembroForm";

export default async function EditarMembroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // id = account id
  const supabase = await createClient();

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
    <>
      <Header variant="back" title="Editar membro" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarMembroForm
          accountId={account.id}
          userId={user.id}
          nomeInicial={user.name ?? ""}
          emailInicial={user.email ?? ""}
          cpfInicial={user.cpf ?? ""}
          birthDateInicial={user.birth_date ?? ""}
          grupoIdInicial={account.group_id ?? ""}
          grupos={grupos ?? []}
        />
      </main>
    </>
  );
}
