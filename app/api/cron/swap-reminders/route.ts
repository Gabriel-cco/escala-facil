import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccount } from "@/lib/send-push";
import { rotuloData } from "@/lib/datas";

// Executa a cada hora via Vercel Cron (schedule: "0 * * * *").
// Para cada troca pendente com evento >= hoje, envia push individualizado
// a cada membro ativo do grupo (perfil 'member'), exceto o próprio solicitante.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Data atual no fuso de Brasília (UTC-3)
  const agora = new Date();
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje = brasilia.toISOString().slice(0, 10);

  const admin = createAdminClient();

  const { data: swaps, error } = await admin
    .from("swap_requests")
    .select(`
      id,
      requester_account_id,
      event:events(name, date, group_id),
      role:roles(name),
      requester:accounts(user:users(name))
    `)
    .eq("status", "pending");

  if (error) {
    console.error("[cron/swap-reminders] erro ao buscar trocas:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apenas trocas com evento a partir de hoje
  const pendentes = (swaps ?? []).filter((s) => {
    const ev = Array.isArray(s.event) ? s.event[0] : s.event;
    return ev && ((ev as { date?: string }).date ?? "") >= hoje;
  });

  console.log(`[cron/swap-reminders] ${pendentes.length} troca(s) pendente(s)`);

  let totalLembretes = 0;

  for (const swap of pendentes) {
    const ev = Array.isArray(swap.event) ? swap.event[0] : swap.event;
    const role = Array.isArray(swap.role) ? swap.role[0] : swap.role;
    const requesterAcc = Array.isArray(swap.requester) ? swap.requester[0] : swap.requester;
    const requesterUser = requesterAcc
      ? (Array.isArray((requesterAcc as { user?: unknown }).user)
          ? ((requesterAcc as { user: unknown[] }).user)[0]
          : (requesterAcc as { user?: unknown }).user)
      : null;

    const eventName = (ev as { name?: string } | null)?.name ?? "evento";
    const eventDate = (ev as { date?: string } | null)?.date ?? "";
    const groupId = (ev as { group_id?: string } | null)?.group_id;
    const roleName = (role as { name?: string } | null)?.name ?? "função";
    const solicitanteNome = (requesterUser as { name?: string } | null)?.name ?? "Um membro";

    if (!groupId) continue;

    const dataLabel = rotuloData(eventDate);

    // Membros ativos do grupo (somente perfil 'member', excluindo o solicitante)
    const { data: membros } = await admin
      .from("accounts")
      .select("id, user:users(name)")
      .eq("group_id", groupId)
      .eq("profile", "member")
      .eq("active", true)
      .neq("id", swap.requester_account_id);

    for (const membro of membros ?? []) {
      const u = Array.isArray(membro.user) ? membro.user[0] : membro.user;
      const nomeCompleto = (u as { name?: string } | null)?.name ?? "";
      const primeiroNome = nomeCompleto.split(" ")[0] || "Olá";

      await sendPushToAccount(membro.id, {
        title: "Troca ainda pendente",
        body: `Olá, ${primeiroNome}! ${solicitanteNome} ainda precisa de alguém para cobrir ${roleName} em ${eventName} — ${dataLabel}. Você consegue ajudar?`,
        url: "/trocas",
      });

      totalLembretes++;
    }

    console.log(
      `[cron/swap-reminders] swap ${swap.id} "${eventName}" → ${(membros ?? []).length} lembrete(s)`
    );
  }

  console.log(`[cron/swap-reminders] concluído | ${totalLembretes} lembrete(s) enviado(s)`);

  return NextResponse.json({ pendentes: pendentes.length, lembretes: totalLembretes });
}
