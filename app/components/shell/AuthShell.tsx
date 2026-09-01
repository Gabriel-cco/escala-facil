import AppShell, { type ShellUser } from "./AppShell";
import { iniciais } from "@/lib/iniciais";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  let shellUser: ShellUser | null = null;
  if (user) {
    const nome =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      "Usuário";

    const supabase = await createClient();
    const [account, { data: userRow }] = await Promise.all([
      getCurrentAccount(),
      supabase
        .from("users")
        .select("avatar_url, tour_completed")
        .eq("auth_id", user.id)
        .single(),
    ]);

    type UserRow = { avatar_url?: string | null; tour_completed?: boolean | null } | null;
    const row = userRow as UserRow;

    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
      avatarUrl: row?.avatar_url ?? null,
      tourCompleted: row?.tour_completed ?? false,
      perfil: (account?.profile as ShellUser["perfil"]) ?? null,
      accountId: account?.account_id ?? null,
      groupId: account?.group_id ?? null,
    };
  }

  return <AppShell user={shellUser}>{children}</AppShell>;
}
