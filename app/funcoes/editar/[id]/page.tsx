import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../../../components/shell/Header";
import EditarFuncaoForm from "../../EditarFuncaoForm";

export default async function EditarFuncaoPage({
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
    <>
      <Header variant="back" title="Editar função" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarFuncaoForm
          id={funcao.id}
          nomeInicial={funcao.name}
          grupoIdInicial={funcao.group_id}
          grupos={grupos ?? []}
          qualificacoes={qualificacoes ?? []}
          requiredQualificationIdInicial={funcao.required_qualification_id ?? null}
          assignmentTypeInicial={(funcao.assignment_type ?? "pessoa") as "pessoa" | "ministerio"}
        />
      </main>
    </>
  );
}
