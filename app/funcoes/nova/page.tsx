import { createClient } from "@/lib/supabase/server";
import Header from "../../components/shell/Header";
import NovaFuncaoForm from "./NovaFuncaoForm";

export default async function NovaFuncaoPage() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (
    <>
      <Header variant="back" title="Nova função" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <NovaFuncaoForm grupos={grupos ?? []} />
      </main>
    </>
  );
}
