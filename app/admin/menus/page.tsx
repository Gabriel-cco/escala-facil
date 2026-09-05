import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/current-user";
import Header from "@/app/components/shell/Header";
import MatrizMenus from "./MatrizMenus";
import { MENU_KEYS } from "@/lib/menu-keys";

const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

export const metadata = { title: "Menus por Grupo — Escala Fácil" };

export default async function AdminMenusPage() {
  const user = await getAuthUser();
  if (!user || user.email !== OWNER_EMAIL) redirect("/");

  const admin = createAdminClient();
  const [{ data: grupos }, { data: excecoes }] = await Promise.all([
    admin.from("groups").select("id, name").eq("active", true).order("name"),
    admin.from("group_menu_permissions").select("group_id, menu_key, visible"),
  ]);

  return (
    <>
      <Header variant="root" title="Menus por Grupo" />
      <main className="flex flex-1 flex-col gap-5 px-[18px] pb-6 pt-0.5 md:p-0">
        <p className="text-[13px] text-muted">
          Marcado = menu visível (padrão). Desmarque para esconder um menu de um grupo específico.
        </p>
        <MatrizMenus
          grupos={grupos ?? []}
          menuKeys={[...MENU_KEYS]}
          excecoesIniciais={
            (excecoes ?? []) as { group_id: string; menu_key: string; visible: boolean }[]
          }
        />
      </main>
    </>
  );
}
