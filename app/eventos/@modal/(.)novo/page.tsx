import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import CriarEventoForm from "@/app/eventos/novo/CriarEventoForm";

// Versão interceptada de /eventos/novo: abre como modal sobre a lista.
export default async function CriarEventoModal() {
  const supabase = await createClient();
  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nome")
    .order("nome", { ascending: true });

  return (
    <Modal title="Criar evento">
      <CriarEventoForm grupos={grupos ?? []} />
    </Modal>
  );
}
