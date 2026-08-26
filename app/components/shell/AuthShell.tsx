import AppShell, { type ShellUser } from "./AppShell";
import { iniciais } from "@/lib/iniciais";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";

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

    const account = await getCurrentAccount();

    shellUser = {
      nome,
      email: user.email ?? "",
      iniciais: iniciais(nome),
      perfil: (account?.profile as ShellUser["perfil"]) ?? null,
      accountId: account?.account_id ?? null,
      groupId: account?.group_id ?? null,
    };
  }

  return <AppShell user={shellUser}>{children}</AppShell>;
}
