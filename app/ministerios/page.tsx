// TEMPORÁRIO: acesso restrito a gabrielbatista1551@gmail.com.
// Revisitar quando decidirmos como abrir gestão de ministérios para outros coordenadores.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/current-user";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "@/app/components/shell/Header";
import MinisteriosManager from "./MinisteriosManager";

const OWNER_EMAIL = "gabrielbatista1551@gmail.com";

export default async function MinisteriosPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.email !== OWNER_EMAIL) {
    redirect("/eventos");
  }

  const activeGroupId = await getActiveGroupId();

  if (!activeGroupId) {
    return (
      <>
        <Header variant="back" title="Ministérios" />
        <main className="flex-1 px-[18px] py-6">
          <p className="text-[13px] text-muted">
            Selecione um grupo ativo para gerenciar seus ministérios.
          </p>
        </main>
      </>
    );
  }

  const supabase = await createClient();

  const { data: grupo } = await supabase
    .from("groups")
    .select("name")
    .eq("id", activeGroupId)
    .single();

  const { data: ministerios } = await supabase
    .from("ministerios")
    .select("id, name")
    .eq("group_id", activeGroupId)
    .order("name", { ascending: true });

  return (
    <>
      <Header variant="back" title="Ministérios" />
      <main className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-0.5 md:p-0">
        <div className="text-[13px] text-muted">
          {grupo?.name ?? "Grupo"}
        </div>
        <MinisteriosManager
          groupId={activeGroupId}
          ministerios={ministerios ?? []}
        />
      </main>
    </>
  );
}
