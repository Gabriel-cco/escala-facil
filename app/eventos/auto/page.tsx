import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import { getActiveGroupId } from "@/lib/active-group-server";
import Header from "@/app/components/shell/Header";
import AutoEscalaClient from "./AutoEscalaClient";

export default async function AutoEscalaPage() {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") redirect("/eventos");

  const activeGroupId = await getActiveGroupId();
  const supabase = await createClient();

  const { data: grupo } = activeGroupId
    ? await supabase
        .from("groups")
        .select("id, name")
        .eq("id", activeGroupId)
        .single()
    : { data: null };

  if (!grupo) {
    return (
      <>
        <Header variant="back" title="Escala automática" />
        <main className="flex-1 px-[18px] py-6">
          <p className="text-[13px] text-muted">
            Selecione um grupo ativo para continuar.
          </p>
        </main>
      </>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);

  const { data: eventos } = await supabase
    .from("events")
    .select("id, name, date, time, event_roles(id)")
    .eq("group_id", grupo.id)
    .gte("date", hoje)
    .lte("date", limite)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const eventIds = (eventos ?? []).map((e) => e.id);
  const { data: assignmentRows } = eventIds.length
    ? await supabase
        .from("assignments")
        .select("event_id")
        .in("event_id", eventIds)
    : { data: [] };

  const atribPorEvento = new Map<string, number>();
  for (const a of assignmentRows ?? []) {
    atribPorEvento.set(a.event_id, (atribPorEvento.get(a.event_id) ?? 0) + 1);
  }

  const eventosParaUI = (eventos ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date as string,
    time: (e.time ?? null) as string | null,
    totalFuncoes: (e.event_roles ?? []).length,
    atribuidas: atribPorEvento.get(e.id) ?? 0,
  }));

  return (
    <>
      <Header variant="back" title="Escala automática" />
      <main className="flex flex-1 flex-col px-[18px] pb-8 pt-0.5 md:p-0">
        <AutoEscalaClient
          groupId={grupo.id}
          grupoNome={grupo.name}
          eventos={eventosParaUI}
        />
      </main>
    </>
  );
}
