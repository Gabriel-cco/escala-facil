import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import CadastrarMembroForm from "@/app/membros/novo/CadastrarMembroForm";

export default async function CadastrarMembroModal() {
  const supabase = await createClient();
  const [{ data: grupos }, conta] = await Promise.all([
    supabase.from("groups").select("id, name").eq("active", true).order("name"),
    getCurrentAccount(),
  ]);

  const isAdmin = conta?.profile === "admin";
  const grupoIdFixo = conta?.profile === "coordinator" ? (conta.group_id ?? "") : "";

  return (
    <Modal title="Cadastrar pessoa">
      <CadastrarMembroForm
        grupos={grupos ?? []}
        accountId={conta?.account_id}
        isAdmin={isAdmin}
        grupoIdFixo={grupoIdFixo}
      />
    </Modal>
  );
}
