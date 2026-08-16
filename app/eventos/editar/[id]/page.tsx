import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "../../../components/shell/Header";
import EditarEventoForm from "../../EditarEventoForm";

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, name, date, time, group_id, liturgical_name, liturgical_color")
    .eq("id", id)
    .single();

  if (!evento) notFound();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  return (
    <>
      <Header variant="back" title="Editar evento" />
      <main className="flex flex-1 flex-col px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarEventoForm
          id={evento.id}
          nomeInicial={evento.name}
          dataInicial={evento.date}
          horaInicial={evento.time}
          grupoIdInicial={evento.group_id}
          liturgicalNameInicial={evento.liturgical_name}
          liturgicalColorInicial={evento.liturgical_color}
          grupos={grupos ?? []}
        />
      </main>
    </>
  );
}
