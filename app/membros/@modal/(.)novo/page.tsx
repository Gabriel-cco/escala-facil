import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import CadastrarMembroForm from "@/app/membros/novo/CadastrarMembroForm";

// Versão interceptada de /membros/novo: abre como modal sobre a lista.
export default async function CadastrarMembroModal() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (
    <Modal title="Cadastrar membro">
      <CadastrarMembroForm grupos={grupos ?? []} />
    </Modal>
  );
}
