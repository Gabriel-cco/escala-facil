import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import { calcularPesos, sortearPonderado, type PropostaSlot } from "@/lib/auto-escala";

export async function POST(request: Request) {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const {
      groupId,
      eventId,
      eventDate,
      eventName,
      roleId,
      roleName,
      excludeIds, // accountIds já usados neste evento (outros slots do rascunho)
    } = await request.json() as {
      groupId: string;
      eventId: string;
      eventDate: string;
      eventName: string;
      roleId: string;
      roleName: string;
      excludeIds: string[];
    };

    const supabase = await createClient();

    // Busca candidatos elegíveis (mesmo critério do gerarRascunho)
    const { data: todosRaw } = await supabase
      .from("accounts")
      .select("id, suspended_until, user:users(name)")
      .eq("group_id", groupId)
      .or("profile.eq.member,disponivel_para_escala.eq.true")
      .eq("active", true);

    let candidatos = (todosRaw ?? [])
      .map((c) => {
        const u = Array.isArray(c.user) ? c.user[0] : c.user;
        return {
          id: c.id,
          nome: (u as { name?: string } | null)?.name ?? "—",
          suspended_until: (c as { suspended_until?: string | null }).suspended_until ?? null,
        };
      })
      .filter(({ suspended_until }) => !suspended_until || suspended_until < eventDate);

    // Filtro por qualificação exigida
    const { data: roleData } = await supabase
      .from("roles")
      .select("required_qualification_id")
      .eq("id", roleId)
      .single();

    if (roleData?.required_qualification_id) {
      const { data: qualificados } = await supabase
        .from("account_qualifications")
        .select("account_id")
        .eq("qualification_id", roleData.required_qualification_id);
      const idsQual = new Set((qualificados ?? []).map((q) => q.account_id));
      candidatos = candidatos.filter((c) => idsQual.has(c.id));
    }

    // Excludentes
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

    candidatos = candidatos.filter((c) => !idsExcluidos.has(c.id));

    const elegiveis = candidatos.map(({ id, nome }) => ({ id, nome }));

    // Prefere quem não está já escalado neste evento
    const excluirSet = new Set(excludeIds ?? []);
    const semRepetir = candidatos.filter(({ id }) => !excluirSet.has(id));
    const pool = semRepetir.length > 0 ? semRepetir : candidatos;

    if (pool.length === 0) {
      const slot: PropostaSlot = {
        eventId, eventDate, eventName, roleId, roleName,
        accountId: null, accountName: "Sem elegíveis",
        dias: 0, taxa: 0, totalElegiveis: 0, eligiveis: [],
      };
      return Response.json({ slot });
    }

    const comPeso = await calcularPesos(supabase, pool, groupId);
    const escolhidoId = sortearPonderado(comPeso);
    const escolhido = comPeso.find((c) => c.id === escolhidoId)!;

    const slot: PropostaSlot = {
      eventId, eventDate, eventName, roleId, roleName,
      accountId: escolhidoId,
      accountName: escolhido.nome,
      dias: escolhido.dias,
      taxa: escolhido.taxa,
      totalElegiveis: pool.length,
      eligiveis: elegiveis,
    };

    return Response.json({ slot });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
