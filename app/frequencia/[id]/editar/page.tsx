import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import { iniciais } from "@/lib/iniciais";
import Header from "../../../components/shell/Header";
import FazerChamadaForm, { type EntradaRoster } from "../../nova/FazerChamadaForm";

export const dynamic = "force-dynamic";

type RawRecord = {
  id: string;
  account_id: string | null;
  external_name: string | null;
  present: boolean;
  account?: unknown;
};

export default async function EditarFrequenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") redirect("/");

  const supabase = await createClient();

  const { data: lista, error } = await supabase
    .from("attendance_lists")
    .select(
      `id, name, date, time, event_id, group_id,
       attendance_records(
         id, account_id, external_name, present,
         account:accounts(user:users(name))
       )`
    )
    .eq("id", id)
    .single();

  if (error || !lista) redirect("/frequencia");

  const groupId = lista.group_id as string;

  const [membrosRes, eventosRes, grupoRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, user:users(name)")
      .eq("group_id", groupId)
      .eq("active", true)
      .in("profile", ["member", "coordinator"]),
    supabase
      .from("events")
      .select("id, name, date, time")
      .eq("group_id", groupId)
      .order("date")
      .limit(30),
    supabase
      .from("groups")
      .select("name")
      .eq("id", groupId)
      .maybeSingle(),
  ]);

  const membros = (membrosRes.data ?? [])
    .map((a) => {
      const u = Array.isArray(a.user) ? a.user[0] : a.user;
      const nome = (u as { name?: string } | null)?.name ?? "—";
      return { id: a.id, nome };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const eventos = (eventosRes.data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    time: e.time ?? "",
  }));

  const grupoNome = (grupoRes.data as { name?: string } | null)?.name ?? "";

  // Montar roster a partir dos registros existentes
  const records = (lista.attendance_records as unknown as RawRecord[]) ?? [];
  const presencaPorAccount = new Map<string, boolean>();
  const externalRecords: Array<{ id: string; nome: string; present: boolean }> = [];

  records.forEach((r) => {
    if (r.account_id) {
      presencaPorAccount.set(r.account_id, r.present);
    } else if (r.external_name) {
      externalRecords.push({ id: r.id, nome: r.external_name, present: r.present });
    }
  });

  const initialRoster: EntradaRoster[] = [
    ...membros.map((m) => ({
      tipo: "membro" as const,
      id: m.id,
      nome: m.nome,
      iniciais: iniciais(m.nome),
      presente: presencaPorAccount.get(m.id) ?? false,
    })),
    ...externalRecords.map((e) => ({
      tipo: "externo" as const,
      id: `ext_${e.id}`,
      nome: e.nome,
      iniciais: iniciais(e.nome),
      presente: e.present,
    })),
  ];

  return (
    <>
      <Header variant="back" title="Editar chamada" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <FazerChamadaForm
          accountId={conta.account_id}
          perfil={conta.profile}
          grupoIdInicial={groupId}
          grupoNomeInicial={grupoNome}
          membrosIniciais={membros}
          eventosIniciais={eventos}
          grupos={[]}
          listaId={id}
          initialNome={lista.name}
          initialDate={lista.date}
          initialTime={(lista.time as string | null) ?? undefined}
          initialEventoId={(lista.event_id as string | null) ?? undefined}
          initialRoster={initialRoster}
        />
      </main>
    </>
  );
}
