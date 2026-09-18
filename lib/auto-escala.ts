import type { SupabaseClient } from "@supabase/supabase-js";

export type PropostaSlot = {
  eventId: string;
  eventDate: string;
  eventName: string;
  roleId: string;
  roleName: string;
  accountId: string | null;
  accountName: string;
  dias: number;
  taxa: number;
  totalElegiveis: number;
  eligiveis: { id: string; nome: string }[];
};

export function sortearPonderado(candidatos: { id: string; peso: number }[]): string {
  const soma = candidatos.reduce((s, c) => s + c.peso, 0);
  let alvo = Math.random() * soma;
  for (const c of candidatos) {
    alvo -= c.peso;
    if (alvo <= 0) return c.id;
  }
  return candidatos[candidatos.length - 1].id;
}

export async function calcularPesos(
  supabase: SupabaseClient,
  candidatos: { id: string; nome: string }[],
  groupId: string
): Promise<{ id: string; nome: string; dias: number; taxa: number; peso: number }[]> {
  if (candidatos.length === 0) return [];

  const ids = candidatos.map((c) => c.id);
  const hoje = Date.now();
  const limite90d = new Date(hoje - 90 * 86400000).toISOString().slice(0, 10);

  // Busca todos os eventos do grupo (para filtrar assignments por grupo)
  const { data: groupEvents } = await supabase
    .from("events")
    .select("id, date")
    .eq("group_id", groupId);
  const groupEventMap = new Map((groupEvents ?? []).map((e) => [e.id, e.date]));

  // Assignments desses candidatos em eventos deste grupo
  const { data: assignments } =
    groupEventMap.size > 0
      ? await supabase
          .from("assignments")
          .select("account_id, event_id")
          .in("account_id", ids)
          .in("event_id", [...groupEventMap.keys()])
      : { data: [] };

  const lastAssignmentDate = new Map<string, string>();
  for (const a of assignments ?? []) {
    const date = groupEventMap.get(a.event_id);
    if (!date) continue;
    const current = lastAssignmentDate.get(a.account_id);
    if (!current || date > current) lastAssignmentDate.set(a.account_id, date);
  }

  // Presença nos últimos 90 dias
  let attRows: { account_id: string; status: string; al_date: string }[] = [];
  try {
    const { data: attData } = await supabase
      .from("attendance_records")
      .select("account_id, status, attendance_list:attendance_lists(date)")
      .in("account_id", ids);
    attRows = (attData ?? [])
      .map((r) => {
        const al = Array.isArray(r.attendance_list) ? r.attendance_list[0] : r.attendance_list;
        return {
          account_id: r.account_id,
          status: r.status as string,
          al_date: (al as { date?: string } | null)?.date ?? "",
        };
      })
      .filter((r) => r.al_date >= limite90d);
  } catch {
    // tabela pode ter estrutura diferente — não penaliza ninguém
  }

  const attMap = new Map<string, { presentes: number; total: number }>();
  for (const r of attRows) {
    if (!attMap.has(r.account_id)) attMap.set(r.account_id, { presentes: 0, total: 0 });
    const entry = attMap.get(r.account_id)!;
    entry.total++;
    if (r.status === "presente") entry.presentes++;
  }

  return candidatos.map(({ id, nome }) => {
    const last = lastAssignmentDate.get(id);
    const dias = last
      ? Math.max(Math.floor((hoje - new Date(last).getTime()) / 86400000), 1)
      : 999;
    const att = attMap.get(id);
    const taxa = att && att.total > 0 ? att.presentes / att.total : 1;
    return { id, nome, dias, taxa, peso: dias * taxa };
  });
}

export async function gerarRascunho(
  supabase: SupabaseClient,
  groupId: string,
  eventIds: string[]
): Promise<PropostaSlot[]> {
  // 1. Todos os candidatos do grupo (ativos)
  const { data: todosRaw } = await supabase
    .from("accounts")
    .select("id, suspended_until, user:users(name)")
    .eq("group_id", groupId)
    .or("profile.eq.member,disponivel_para_escala.eq.true")
    .eq("active", true);

  type CandBase = { id: string; nome: string; suspended_until: string | null };
  const todos: CandBase[] = (todosRaw ?? []).map((c) => {
    const u = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      id: c.id,
      nome: (u as { name?: string } | null)?.name ?? "—",
      suspended_until: (c as { suspended_until?: string | null }).suspended_until ?? null,
    };
  });

  // 2. Pré-calcular pesos (batch único)
  const pesosMap = new Map<string, { dias: number; taxa: number; peso: number }>();
  if (todos.length > 0) {
    const pesos = await calcularPesos(supabase, todos, groupId);
    for (const p of pesos) pesosMap.set(p.id, { dias: p.dias, taxa: p.taxa, peso: p.peso });
  }

  // 3. Qualificações excludentes (Mirim etc.) — gracioso se coluna não existir
  const idsExcluidos = new Set<string>();
  try {
    const { data: excQuals } = await supabase
      .from("qualifications")
      .select("id")
      .eq("group_id", groupId)
      .eq("exclui_de_escala", true);
    if (excQuals?.length) {
      const { data: excAcc } = await supabase
        .from("account_qualifications")
        .select("account_id")
        .in("qualification_id", excQuals.map((q) => q.id));
      for (const e of excAcc ?? []) idsExcluidos.add(e.account_id);
    }
  } catch { /* coluna ainda não existe */ }

  // 4. Qualificações de cada candidato (batch)
  const { data: allAQ } =
    todos.length > 0
      ? await supabase
          .from("account_qualifications")
          .select("account_id, qualification_id")
          .in("account_id", todos.map((t) => t.id))
      : { data: [] };
  const aqByQual = new Map<string, Set<string>>();
  for (const aq of allAQ ?? []) {
    if (!aqByQual.has(aq.qualification_id)) aqByQual.set(aq.qualification_id, new Set());
    aqByQual.get(aq.qualification_id)!.add(aq.account_id);
  }

  // 5. Funções dos eventos (batch) + fallback para funções do grupo
  const { data: erAll } = await supabase
    .from("event_roles")
    .select("event_id, role:roles(id, name, required_qualification_id)")
    .in("event_id", eventIds);

  const rolesPorEvento = new Map<string, { id: string; name: string; rqId: string | null }[]>();
  for (const er of erAll ?? []) {
    const r = Array.isArray(er.role) ? er.role[0] : er.role;
    const rt = r as { id: string; name: string; required_qualification_id?: string | null } | null;
    if (!rt?.id) continue;
    if (!rolesPorEvento.has(er.event_id)) rolesPorEvento.set(er.event_id, []);
    rolesPorEvento.get(er.event_id)!.push({ id: rt.id, name: rt.name, rqId: rt.required_qualification_id ?? null });
  }

  const { data: groupRoles } = await supabase
    .from("roles")
    .select("id, name, required_qualification_id")
    .eq("group_id", groupId)
    .eq("active", true);
  const groupRolesFallback = (groupRoles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    rqId: (r as { required_qualification_id?: string | null }).required_qualification_id ?? null,
  }));

  // 6. Atribuições já existentes (batch)
  const { data: existingAll } = await supabase
    .from("assignments")
    .select("event_id, role_id")
    .in("event_id", eventIds);
  const existingSet = new Set((existingAll ?? []).map((a) => `${a.event_id}::${a.role_id}`));

  // 7. Dados dos eventos (batch)
  const { data: eventosData } = await supabase
    .from("events")
    .select("id, name, date")
    .in("id", eventIds);
  const eventoMap = new Map((eventosData ?? []).map((e) => [e.id, e]));

  // 8. Gerar propostas
  const propostas: PropostaSlot[] = [];

  for (const eventId of eventIds) {
    const evento = eventoMap.get(eventId);
    if (!evento) continue;

    const roles = rolesPorEvento.get(eventId) ?? groupRolesFallback;
    const jaEscaladoNesseEvento = new Set<string>();

    for (const role of roles) {
      if (existingSet.has(`${eventId}::${role.id}`)) continue;

      // Elegíveis: filtra suspensão (por data), excludentes, qualificação exigida
      const elegiveis = todos.filter(({ id, suspended_until }) => {
        if (idsExcluidos.has(id)) return false;
        if (suspended_until && suspended_until >= evento.date) return false;
        if (role.rqId) {
          const qualSet = aqByQual.get(role.rqId);
          if (!qualSet?.has(id)) return false;
        }
        return true;
      });

      const semRepetir = elegiveis.filter(({ id }) => !jaEscaladoNesseEvento.has(id));
      const pool = semRepetir.length > 0 ? semRepetir : elegiveis;

      if (pool.length === 0) {
        propostas.push({
          eventId, eventDate: evento.date, eventName: evento.name,
          roleId: role.id, roleName: role.name,
          accountId: null, accountName: "Sem elegíveis",
          dias: 0, taxa: 0, totalElegiveis: 0, eligiveis: [],
        });
        continue;
      }

      const poolComPeso = pool.map(({ id, nome }) => {
        const p = pesosMap.get(id) ?? { dias: 999, taxa: 1, peso: 999 };
        return { id, ...p };
      });

      const escolhidoId = sortearPonderado(poolComPeso);
      const escolhido = poolComPeso.find((c) => c.id === escolhidoId)!;
      jaEscaladoNesseEvento.add(escolhidoId);

      propostas.push({
        eventId, eventDate: evento.date, eventName: evento.name,
        roleId: role.id, roleName: role.name,
        accountId: escolhidoId,
        accountName: todos.find((t) => t.id === escolhidoId)?.nome ?? "—",
        dias: escolhido.dias, taxa: escolhido.taxa,
        totalElegiveis: pool.length,
        eligiveis: elegiveis.map(({ id, nome }) => ({ id, nome })),
      });
    }
  }

  return propostas;
}
