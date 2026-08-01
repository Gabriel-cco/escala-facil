import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../components/shell/Header";
import UsuariosManager from "./UsuariosManager";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: rpcData } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  // A RPC retorna um array (setof) — o perfil está no primeiro registro.
  const perfil = (rpcData as { profile?: string }[] | null)?.[0]?.profile;
  if (perfil !== "admin") redirect("/");

  // Busca todos accounts com user e grupo
  const { data: rawAccounts } = await supabase
    .from("accounts")
    .select("id, profile, group_id, suspended_until, active, user:users(id, name, email), group:groups(id, name)")
    .order("id");

  type AccountRow = {
    id: string;
    profile: string;
    group_id: string | null;
    suspended_until: string | null;
    active: boolean;
    user: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
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
      userName: user?.name ?? "",
      userEmail: user?.email ?? "",
      userId: user?.id ?? "",
      groupName: group?.name ?? null,
    };
  });

  return (
    <>
      <Header variant="root" title="Usuários" />
      <main className="flex flex-1 flex-col gap-0 px-[18px] pb-6 pt-0 md:p-0">
        <UsuariosManager
          contas={contas}
          grupos={grupos}
          adminAccountId={(contas.find((c) => c.userEmail === authUser.email))?.id ?? ""}
        />
      </main>
    </>
  );
}
