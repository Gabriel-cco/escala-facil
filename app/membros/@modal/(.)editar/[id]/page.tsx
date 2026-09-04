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

  const [gruposResult, qualificacoesResult, qualificacoesAtuaisResult, ministeriosResult, ministeriosDisponiveisResult] =
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
        .select("ministerio_id, ministerio:ministerios(name)")
        .eq("account_id", id),
      groupId
        ? supabase.from("ministerios").select("id, name").eq("group_id", groupId).order("name")
        : Promise.resolve({ data: [] }),
    ]);

  const ministeriosVinculados = (ministeriosResult.data ?? []).map((r) => {
    const min = r.ministerio;
    const obj = (Array.isArray(min) ? min[0] : min) as { name?: string } | null;
    return { ministerio_id: r.ministerio_id, name: obj?.name ?? "" };
  }).filter((m) => m.name);

  return (
    <Modal title="Editar pessoa">
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
        ministeriosVinculados={ministeriosVinculados}
        ministeriosDisponiveis={groupId ? (ministeriosDisponiveisResult.data ?? []) : undefined}
      />
    </Modal>
  );
}
