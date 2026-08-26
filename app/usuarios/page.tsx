import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import UsuariosManager from "./UsuariosManager";

export default async function UsuariosPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const conta = await getCurrentAccount();
  if (conta?.profile !== "admin") redirect("/");

  const supabase = await createClient();

  // Busca todos accounts com user e grupo
  const { data: rawAccounts } = await supabase
    .from("accounts")
    .select("id, profile, group_id, suspended_until, active, user:users(id, name, email, auth_id), group:groups(id, name)")
    .order("id");

  type UserRow = { id: string; name: string; email: string; auth_id: string | null };
  type AccountRow = {
    id: string;
    profile: string;
    group_id: string | null;
    suspended_until: string | null;
    active: boolean;
    user: UserRow | UserRow[] | null;
    group: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const accounts = (rawAccounts ?? []) as unknown as AccountRow[];

  const { data: rawGrupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name");

  type GrupoRow = { id: string; name: string };
  const grupos = (rawGrupos ?? []) as GrupoRow[];

  // Normaliza para o componente
  const contas = accounts.map((a) => {
    const user = Array.isArray(a.user) ? a.user[0] : a.user;
    const group = Array.isArray(a.group) ? a.group[0] : a.group;
    return {
      id: a.id,
      profile: a.profile,
      group_id: a.group_id,
      suspended_until: a.suspended_until,
      active: a.active,
      pendente: !user?.auth_id,
      userName: user?.name ?? "",
      userEmail: user?.email ?? "",
      userId: user?.id ?? "",
      groupName: group?.name ?? null,
    };
  }).sort((a, b) => a.userName.localeCompare(b.userName, "pt-BR"));

  return (
    <>
      <Header variant="root" title="Usuários" />
      <main className="flex flex-1 flex-col gap-0 px-[18px] pb-6 pt-0 md:p-0">
        <UsuariosManager
          contas={contas}
          grupos={grupos}
          adminAccountId={(contas.find((c) => c.userEmail === user.email))?.id ?? ""}
        />
      </main>
    </>
  );
}
