import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import NovaFuncaoForm from "@/app/funcoes/nova/NovaFuncaoForm";

// Versão interceptada de /funcoes/nova: abre como modal sobre a lista.
export default async function NovaFuncaoModal() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (
    <Modal title="Nova função">
      <NovaFuncaoForm grupos={grupos ?? []} />
    </Modal>
  );
}
