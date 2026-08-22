import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { rotuloHora } from "@/lib/datas";

// Executa diariamente às 8h (Brasília) via Vercel Cron (schedule: "0 11 * * *" UTC).
// Busca eventos do dia, notifica cada membro escalado com a escala completa.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Data de hoje no fuso de Brasília (UTC-3)
  const agora = new Date();
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje = brasilia.toISOString().slice(0, 10);

  const admin = createAdminClient();

  // Eventos de hoje com atribuições, papéis, nomes dos membros e nome do grupo
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
    .eq("date", hoje);

  if (error) {
    console.error("[cron/notify-events]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!eventos?.length) {
    return NextResponse.json({ message: "Nenhum evento hoje.", count: 0 });
  }

  let totalEnviados = 0;

  for (const evento of eventos) {
    const atribuicoes = (evento.assignments ?? []) as unknown as Array<{
      account_id: string;
      role: { name: string } | { name: string }[] | null;
      account: { user: { name: string } | { name: string }[] | null } | null;
    }>;

    if (!atribuicoes.length) continue;

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

    const title = `Ei, ${grupoNome}! Hoje é dia de servir 🕊️`;
    const body = `${evento.name} · ${hora}\n\n${escalaTxt}`;
    const destinatarios = [...new Set(escala.map((e) => e.accountId))];

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

    totalEnviados += destinatarios.length;
  }

  return NextResponse.json({
    date: hoje,
    eventos: eventos.length,
    notificados: totalEnviados,
  });
}
