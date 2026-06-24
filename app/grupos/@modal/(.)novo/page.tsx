import Modal from "@/app/components/shell/Modal";
import NovoGrupoForm from "@/app/grupos/novo/NovoGrupoForm";

// Versão interceptada de /grupos/novo: abre como modal sobre a lista.
export default function NovoGrupoModal() {
  return (
    <Modal title="Novo grupo">
      <NovoGrupoForm />
    </Modal>
  );
}
