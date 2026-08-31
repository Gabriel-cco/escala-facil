import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import NovaFuncaoForm from "@/app/funcoes/nova/NovaFuncaoForm";

export default async function NovaFuncaoModal() {
  const supabase = await createClient();

  const [{ data: grupos }, { data: qualificacoes }] = await Promise.all([
    supabase.from("groups").select("id, name").order("name", { ascending: true }),
    supabase.from("qualifications").select("id, name, group_id").order("name", { ascending: true }),
  ]);

  return (
    <Modal title="Nova função">
      <NovaFuncaoForm grupos={grupos ?? []} qualificacoes={qualificacoes ?? []} />
    </Modal>
  );
}
