import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import EditarFuncaoForm from "@/app/funcoes/EditarFuncaoForm";

export default async function EditarFuncaoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: funcao } = await supabase
    .from("roles")
    .select("id, name, group_id, required_qualification_id, assignment_type")
    .eq("id", id)
    .single();

  if (!funcao) notFound();

  const [{ data: grupos }, { data: qualificacoes }] = await Promise.all([
    supabase.from("groups").select("id, name").eq("active", true).order("name", { ascending: true }),
    supabase.from("qualifications").select("id, name, group_id").order("name", { ascending: true }),
  ]);

  return (
    <Modal title="Editar função">
      <EditarFuncaoForm
        id={funcao.id}
        nomeInicial={funcao.name}
        grupoIdInicial={funcao.group_id}
        grupos={grupos ?? []}
        qualificacoes={qualificacoes ?? []}
        requiredQualificationIdInicial={funcao.required_qualification_id ?? null}
        assignmentTypeInicial={(funcao.assignment_type ?? "pessoa") as "pessoa" | "ministerio"}
      />
    </Modal>
  );
}
