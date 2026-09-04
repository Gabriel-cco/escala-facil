import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import CadastrarMembroForm from "./CadastrarMembroForm";

export default async function NovoMembroPage() {
  const supabase = await createClient();
  const [{ data: grupos }, conta] = await Promise.all([
    supabase.from("groups").select("id, name").eq("active", true).order("name"),
    getCurrentAccount(),
  ]);

  const isAdmin = conta?.profile === "admin";
  const grupoIdFixo = conta?.profile === "coordinator" ? (conta.group_id ?? "") : "";

  const { data: ministerios } = grupoIdFixo
    ? await supabase.from("ministerios").select("id, name").eq("group_id", grupoIdFixo).order("name")
    : { data: [] };

  return (
    <>
      <Header variant="back" title="Cadastrar pessoa" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CadastrarMembroForm
          grupos={grupos ?? []}
          accountId={conta?.account_id}
          isAdmin={isAdmin}
          grupoIdFixo={grupoIdFixo}
          ministerios={ministerios ?? []}
        />
      </main>
    </>
  );
}
