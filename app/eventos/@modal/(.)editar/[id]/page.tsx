import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Modal from "@/app/components/shell/Modal";
import EditarEventoForm from "@/app/eventos/EditarEventoForm";

export default async function EditarEventoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const conta = await getCurrentAccount();

  const { data: evento } = await supabase
    .from("events")
    .select("id, name, date, time, group_id, liturgical_name, liturgical_color, ministerio_id")
    .eq("id", id)
    .single();

  if (!evento) notFound();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });

  const grupoIds = (grupos ?? []).map((g) => g.id);
  const { data: ministeriosData } = grupoIds.length
    ? await supabase
        .from("ministerios")
        .select("id, name, group_id")
        .in("group_id", grupoIds)
        .order("name", { ascending: true })
    : { data: [] };

  const ministeriosPorGrupo: Record<string, { id: string; name: string }[]> = {};
  for (const m of ministeriosData ?? []) {
    if (!ministeriosPorGrupo[m.group_id]) ministeriosPorGrupo[m.group_id] = [];
    ministeriosPorGrupo[m.group_id].push({ id: m.id, name: m.name });
  }

  const eventoComMin = evento as typeof evento & { ministerio_id?: string | null };

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
        ministerioIdInicial={eventoComMin.ministerio_id ?? null}
        grupos={grupos ?? []}
        ministeriosPorGrupo={ministeriosPorGrupo}
        accountId={conta?.account_id}
      />
    </Modal>
  );
}
