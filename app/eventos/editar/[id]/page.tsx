import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import Header from "../../../components/shell/Header";
import EditarEventoForm from "../../EditarEventoForm";
import EventRolesEditor from "../../EventRolesEditor";

export default async function EditarEventoPage({
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

  const [gruposResult, grupoRolesResult, eventRolesResult] = await Promise.all([
    supabase.from("groups").select("id, name").eq("active", true).order("name", { ascending: true }),
    supabase.from("roles").select("id, name").eq("group_id", evento.group_id).eq("active", true).order("name", { ascending: true }),
    supabase.from("event_roles").select("role_id").eq("event_id", id),
  ]);

  const grupoRoles = grupoRolesResult.data ?? [];
  const activeRoleIds = (eventRolesResult.data ?? []).map((er) => er.role_id);

  const grupoIds = (gruposResult.data ?? []).map((g) => g.id);
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
    <>
      <Header variant="back" title="Editar evento" />
      <main className="flex flex-1 flex-col gap-6 px-[22px] pb-6 pt-0.5 md:p-0">
        <EditarEventoForm
          id={evento.id}
          nomeInicial={evento.name}
          dataInicial={evento.date}
          horaInicial={evento.time}
          grupoIdInicial={evento.group_id}
          liturgicalNameInicial={evento.liturgical_name}
          liturgicalColorInicial={evento.liturgical_color}
          ministerioIdInicial={eventoComMin.ministerio_id ?? null}
          grupos={gruposResult.data ?? []}
          ministeriosPorGrupo={ministeriosPorGrupo}
          accountId={conta?.account_id}
        />
        {grupoRoles.length > 0 && (
          <EventRolesEditor
            eventId={id}
            roles={grupoRoles.map((r) => ({ id: r.id, nome: r.name }))}
            initialActiveIds={activeRoleIds}
          />
        )}
      </main>
    </>
  );
}
