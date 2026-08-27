import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../components/shell/Header";
import CriarEventoForm from "./CriarEventoForm";

export default async function NovoEventoPage() {
  const supabase = await createClient();
  const [{ data: grupos }, conta] = await Promise.all([
    supabase.from("groups").select("id, name").order("name", { ascending: true }),
    getCurrentAccount(),
  ]);

  return (
    <>
      <Header variant="back" title="Criar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CriarEventoForm grupos={grupos ?? []} accountId={conta?.account_id} />
      </main>
    </>
  );
}
