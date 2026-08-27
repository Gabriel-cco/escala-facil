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
    .select("id, name, date, time, group_id, liturgical_name, liturgical_color")
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
          grupos={gruposResult.data ?? []}
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
