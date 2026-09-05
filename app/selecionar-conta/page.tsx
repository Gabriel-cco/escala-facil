import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/current-user";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/active-group";
import SelecionarContaForm, { type ContaOpcao } from "./SelecionarContaForm";

export default async function SelecionarContaPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Busca todas as contas + nome do grupo em uma query
  const { data: rows } = await admin
    .from("accounts")
    .select("id, profile, group_id, group:groups(name)")
    .eq("active", true)
    .eq("user_id",
      // Resolve user_id a partir do auth_id
      (await admin.from("users").select("id").eq("auth_id", user.id).single()).data?.id ?? ""
    );

  if (!rows || rows.length === 0) redirect("/acesso-pendente");
  if (rows.length === 1) {
    // Conta única: vai direto (não deveria chegar aqui via callback normal)
    const conta = rows[0];
    redirect(conta.profile === "member" ? "/minha-escala" : "/");
  }

  // Se já tem cookie válido, vai direto
  const store = await cookies();
  const activeAccountId = store.get(ACTIVE_ACCOUNT_COOKIE)?.value;
  if (activeAccountId && rows.some((r) => r.id === activeAccountId)) {
    redirect("/");
  }

  const contas: ContaOpcao[] = rows.map((r) => {
    const g = Array.isArray(r.group) ? r.group[0] : r.group;
    return {
      account_id: r.id,
      profile: r.profile as ContaOpcao["profile"],
      group_id: r.group_id ?? null,
      group_name: (g as { name?: string } | null)?.name ?? null,
    };
  });

  return <SelecionarContaForm contas={contas} />;
}
