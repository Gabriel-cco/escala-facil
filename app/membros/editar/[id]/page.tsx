import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../../components/shell/Header";
import EditarMembroForm from "../../EditarMembroForm";

export default async function EditarMembroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const conta = await getCurrentAccount();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, profile, group_id, user:users(id, name, email, cpf, birth_date)")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const user = Array.isArray(account.user) ? account.user[0] : account.user;
  if (!user) notFound();

  const isAdmin = conta?.profile === "admin";
  const groupId = account.group_id;

  const [gruposResult, qualificacoesResult, qualificacoesAtuaisResult, ministeriosResult] =
    await Promise.all([
      isAdmin
        ? supabase.from("groups").select("id, name").eq("active", true).order("name")
        : Promise.resolve({ data: [] }),
      groupId
        ? supabase.from("qualifications").select("id, name").eq("group_id", groupId).order("name")
        : Promise.resolve({ data: [] }),
      groupId
        ? supabase.from("account_qualifications").select("qualification_id").eq("account_id", id)
        : Promise.resolve({ data: [] }),
      supabase
        .from("ministerio_members")
        .select("ministerio:ministerios(id, name)")
        .eq("account_id", id),
    ]);

  const ministeriosDele = (ministeriosResult.data ?? [])
    .map((r) => {
      const min = r.ministerio;
      const obj = (Array.isArray(min) ? min[0] : min) as { name?: string } | null;
      return obj?.name;
    })
    .filter((n): n is string => !!n);

  return (
    <>
      <Header variant="back" title="Editar pessoa" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarMembroForm
          accountId={account.id}
          userId={user.id}
          nomeInicial={user.name ?? ""}
          emailInicial={user.email ?? ""}
          cpfInicial={user.cpf ?? ""}
          birthDateInicial={user.birth_date ?? ""}
          grupoIdInicial={account.group_id ?? ""}
          perfilInicial={account.profile ?? "member"}
          grupos={gruposResult.data ?? []}
          isAdmin={isAdmin}
          currentAccountId={conta?.account_id}
          qualificacoes={qualificacoesResult.data ?? []}
          qualificacoesAtuais={(qualificacoesAtuaisResult.data ?? []).map((r) => (r as { qualification_id: string }).qualification_id)}
          ministeriosDele={ministeriosDele}
        />
      </main>
    </>
  );
}
