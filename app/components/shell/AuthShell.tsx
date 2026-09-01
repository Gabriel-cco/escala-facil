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
        .select("avatar_url")
        .eq("auth_id", user.id)
        .single(),
    ]);

    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
      avatarUrl: (userRow as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      perfil: (account?.profile as ShellUser["perfil"]) ?? null,
      accountId: account?.account_id ?? null,
      groupId: account?.group_id ?? null,
    };
  }

  return <AppShell user={shellUser}>{children}</AppShell>;
}
