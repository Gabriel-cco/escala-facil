import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAccounts } from "@/lib/send-push";
import { rotuloData, rotuloHora } from "@/lib/datas";
import { liturgicalEmoji } from "@/app/components/LiturgicalDot";

/**
 * Notifica todos os membros escalados de um evento com a escala completa.
 * Disparado pelo botão "Concluir e notificar" na página do evento.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pRows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });
  const account = pRows?.[0] as
    | { account_id: string; profile: string; group_id: string | null }
    | undefined;

  if (!account || (account.profile !== "admin" && account.profile !== "coordinator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: evento } = await admin
    .from("events")
    .select("id, name, date, time, group_id, liturgical_name, liturgical_color")
    .eq("id", eventId)
    .single();

  if (!evento) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }

  // Coordenador só pode notificar eventos do próprio grupo.
  if (account.profile === "coordinator" && account.group_id !== evento.group_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Escala do evento: função → membro.
  const { data: atribuicoes } = await admin
    .from("assignments")
    .select("account_id, role:roles(name), account:accounts(user:users(name))")
    .eq("event_id", eventId);

  if (!atribuicoes?.length) {
    return NextResponse.json({ count: 0 });
  }

  const escala = atribuicoes
    .map((a) => {
      const role = Array.isArray(a.role) ? a.role[0] : a.role;
      const acc = Array.isArray(a.account) ? a.account[0] : a.account;
      const u = acc && (Array.isArray(acc.user) ? acc.user[0] : acc.user);
      return {
        accountId: a.account_id as string,
        roleName: role?.name ?? "Função",
        memberName: u?.name ?? "—",
      };
    })
    .sort((x, y) => x.roleName.localeCompare(y.roleName, "pt-BR"));

  // Monta o corpo: nome já vai no título; aqui data/hora, tempo+cor e a escala.
  const dataLabel = rotuloData(evento.date);
  const horaLabel = rotuloHora(evento.time);
  const litLinha = [liturgicalEmoji(evento.liturgical_color), evento.liturgical_name]
    .filter(Boolean)
    .join(" ");

  const linhas: string[] = [`${dataLabel} · ${horaLabel}`];
  if (litLinha) linhas.push(litLinha);
  linhas.push("");
  linhas.push(...escala.map((e) => `${e.roleName}: ${e.memberName}`));

  const title = `Escala — ${evento.name}`;
  const body = linhas.join("\n");

  const destinatarios = [...new Set(escala.map((e) => e.accountId))];

  await admin.from("notifications").insert(
    destinatarios.map((accountId) => ({
      account_id: accountId,
      title,
      body,
      type: "schedule",
      reference_type: "event",
      reference_id: eventId,
      sender_account_id: account.account_id,
    }))
  );

  await sendPushToAccounts(destinatarios, {
    title,
    body,
    url: "/notificacoes",
  });

  return NextResponse.json({ count: destinatarios.length });
}
