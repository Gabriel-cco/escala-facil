import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../../../components/shell/Header";
import EditarGrupoForm from "../../EditarGrupoForm";

export default async function EditarGrupoPage({
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
    <>
      <Header variant="back" title="Editar grupo" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarGrupoForm
          id={grupo.id}
          nomeInicial={grupo.name}
          descricaoInicial={grupo.description ?? ""}
        />
      </main>
    </>
  );
}
