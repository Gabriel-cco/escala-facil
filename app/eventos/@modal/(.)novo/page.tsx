import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import CriarEventoForm from "@/app/eventos/novo/CriarEventoForm";

// Versão interceptada de /eventos/novo: abre como modal sobre a lista.
export default async function CriarEventoModal() {
  const supabase = await createClient();
  const [{ data: grupos }, conta] = await Promise.all([
    supabase.from("groups").select("id, name").order("name", { ascending: true }),
    getCurrentAccount(),
  ]);

  return (
    <Modal title="Criar evento">
      <CriarEventoForm grupos={grupos ?? []} accountId={conta?.account_id} />
    </Modal>
  );
}
