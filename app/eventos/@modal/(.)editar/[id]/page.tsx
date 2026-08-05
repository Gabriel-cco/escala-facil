import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Modal from "@/app/components/shell/Modal";
import EditarEventoForm from "@/app/eventos/EditarEventoForm";

export default async function EditarEventoModal({
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
    <Modal title="Editar evento">
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
    </Modal>
  );
}
