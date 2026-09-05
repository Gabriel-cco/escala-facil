import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { rotuloHora } from "@/lib/datas";

// Executa duas vezes por dia via Vercel Cron (schedule: "0 9,21 * * *" UTC):
//   09:00 UTC = 06:00 Brasília → notifica escalados do DIA com "Hoje é dia de servir"
//   21:00 UTC = 18:00 Brasília → notifica escalados do DIA SEGUINTE com "Amanhã é dia de servir"
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const agora = new Date();
  const utcHour = agora.getUTCHours();

  // 18:00 UTC = disparo noturno → busca eventos de amanhã; 06:00 UTC → hoje
  const isEvening = utcHour >= 12;
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const dataAlvo = isEvening
    ? new Date(brasilia.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : brasilia.toISOString().slice(0, 10);

  const admin = createAdminClient();

  // Eventos da data alvo com atribuições, papéis, nomes dos membros e nome do grupo
  const { data: eventos, error } = await admin
    .from("events")
    .select(`
      id, name, time, group_id,
      group:groups(name),
      assignments(
        account_id,
        role:roles(name),
        account:accounts(user:users(name))
      )
    `)
    .eq("date", dataAlvo);

  if (error) {
    console.error("[cron/notify-events] erro ao buscar eventos:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const run = isEvening ? "noturno (amanhã)" : "matutino (hoje)";
  console.log(`[cron/notify-events] ${run} | alvo=${dataAlvo} | ${eventos?.length ?? 0} evento(s)`);

  if (!eventos?.length) {
    return NextResponse.json({ message: "Nenhum evento na data alvo.", dataAlvo, count: 0 });
  }

  // Coordenadores ativos por grupo — buscados uma vez para todos os grupos
  const { data: coordenadores } = await admin
    .from("accounts")
    .select("id, group_id")
    .eq("profile", "coordinator")
    .eq("active", true);

  // group_id → [account_id]
  const coordsPorGrupo = new Map<string, string[]>();
  for (const c of coordenadores ?? []) {
    if (!c.group_id) continue;
    const lista = coordsPorGrupo.get(c.group_id) ?? [];
    lista.push(c.id);
    coordsPorGrupo.set(c.group_id, lista);
  }

  let totalEnviados = 0;

  for (const evento of eventos) {
    const atribuicoes = (evento.assignments ?? []) as unknown as Array<{
      account_id: string;
      role: { name: string } | { name: string }[] | null;
      account: { user: { name: string } | { name: string }[] | null } | null;
    }>;

    if (!atribuicoes.length) {
      console.log(`[cron/notify-events] evento ${evento.id} "${evento.name}" — sem atribuições, pulado`);
      continue;
    }

    const grupoRow = Array.isArray(evento.group) ? evento.group[0] : evento.group;
    const grupoNome: string = (grupoRow as { name?: string } | null)?.name ?? "Grupo";
    const hora = rotuloHora(evento.time);

    // Monta a escala ordenada por função
    const escala = atribuicoes
      .map((a) => {
        const role = Array.isArray(a.role) ? a.role[0] : a.role;
        const acc = Array.isArray(a.account) ? a.account[0] : a.account;
        const user = acc && (Array.isArray(acc.user) ? acc.user[0] : acc.user);
        return {
          accountId: a.account_id,
          roleName: (role as { name?: string } | null)?.name ?? "Função",
          memberName: (user as { name?: string } | null)?.name ?? "—",
        };
      })
      .sort((x, y) => x.roleName.localeCompare(y.roleName, "pt-BR"));

    const escalaTxt = escala.map((e) => `${e.roleName}: ${e.memberName}`).join("\n");

    const title = isEvening
      ? `Ei, ${grupoNome}! Amanhã é dia de servir 🕊️`
      : `Ei, ${grupoNome}! Hoje é dia de servir 🕊️`;
    const body = `${evento.name} · ${hora}\n\n${escalaTxt}`;

    // Membros escalados + coordenadores do grupo
    const destinatarios = [
      ...new Set([
        ...escala.map((e) => e.accountId),
        ...(coordsPorGrupo.get(evento.group_id) ?? []),
      ]),
    ];

    // Persiste no banco para aparecer no sino
    await admin.from("notifications").insert(
      destinatarios.map((accountId) => ({
        account_id: accountId,
        title,
        body,
        type: "schedule",
        reference_type: "event",
        reference_id: evento.id,
      }))
    );

    await sendPushToAccounts(destinatarios, { title, body, url: "/minha-escala" });

    console.log(`[cron/notify-events] evento ${evento.id} "${evento.name}" ${hora} → ${destinatarios.length} notificado(s)`);
    totalEnviados += destinatarios.length;
  }

  console.log(`[cron/notify-events] concluído | run=${run} | ${eventos.length} evento(s) | ${totalEnviados} notificação(ões) enviada(s)`);

  return NextResponse.json({
    run,
    dataAlvo,
    eventos: eventos.length,
    notificados: totalEnviados,
  });
}
