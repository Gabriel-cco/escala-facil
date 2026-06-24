import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import CriarEventoForm from "./CriarEventoForm";

export default async function NovoEventoPage() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (
    <>
      <Header variant="back" title="Criar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <CriarEventoForm grupos={grupos ?? []} />
      </main>
    </>
  );
}
