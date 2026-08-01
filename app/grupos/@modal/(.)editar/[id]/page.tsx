import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import EditarGrupoForm from "@/app/grupos/EditarGrupoForm";

export default async function EditarGrupoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grupo } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  return (
    <Modal title="Editar grupo">
      <EditarGrupoForm
        id={grupo.id}
        nomeInicial={grupo.name}
        descricaoInicial={grupo.description ?? ""}
      />
    </Modal>
  );
}
