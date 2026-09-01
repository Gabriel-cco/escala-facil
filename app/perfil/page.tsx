import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentAccount } from "@/lib/current-user";
import Header from "../components/shell/Header";
import PerfilForm from "./PerfilForm";

export default async function PerfilPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: userRow }, conta] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, birth_date, avatar_url")
      .eq("auth_id", user.id)
      .single(),
    getCurrentAccount(),
  ]);

  if (!userRow) redirect("/acesso-pendente");

  return (
    <>
      <Header variant="root" title="Meu Perfil" />
      <main className="flex flex-1 flex-col px-[18px] pb-6 pt-2 md:p-0">
        <PerfilForm
          userId={userRow.id}
          nomeInicial={userRow.name ?? ""}
          email={userRow.email ?? ""}
          birthDateInicial={(userRow as { birth_date?: string | null }).birth_date ?? ""}
          avatarUrlInicial={(userRow as { avatar_url?: string | null }).avatar_url ?? null}
          profile={conta?.profile ?? "member"}
        />
      </main>
    </>
  );
}
